"use strict";
//define mixin
const DbMixin = require("../../mixins/db.mixin");
const token = require("../../mixins/sercure.mixin");
const nodemailer = require("nodemailer");
const { broker, Errors } = require("moleculer");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { MoleculerClientError } = Errors;
const {
	EMAIL_USERNAME,
	EMAIL_PASSWORD,
	APP_URL,
	BCRYPT_SALT_ROUNDS,
	PACKAGE_ID_FREE,
} = process.env;
module.exports = {
	// define name service
	name: "user",
	mixins: [DbMixin("users"), token],
	settings: {
		JWT_SECRET: process.env.JWT_TOKEN,
		DOMAIN_NAME: process.env.DOMAIN_NAME,
		PACKAGE_ID_FREE: process.env.PACKAGE_ID_FREE,
		fields: ["_id", "userName", "email", "password"],
		entityValidator: {
			userName: "string|min:5",
			email: "string|email|unique",
			password: "string|min:4",
		},
	},
	actions: {
		register: {
			rest: "POST /register",
			params: {
				userName: { type: "string", required: true, min: 5 },
				email: { type: "email", required: true },
				password: { type: "string", required: true, min: 4 },
			},
			async handler(ctx) {
				const queryByEmail = ctx.params.email
					? { email: ctx.params.email }
					: {};
				const isExist = await this.adapter.find({
					query: queryByEmail,
					fields: ["email"],
				});
				if (isExist.length > 0) {
					return {
						success: false,
						code: 400,
						message: "Email already exists",
					};
				} else {
					let passwordHash = await bcrypt.hash(
						ctx.params.password,
						parseInt(process.env.BCRYPT_SALT_ROUNDS)
					);
					ctx.params.password = passwordHash;
					const user = await this.adapter.insert(ctx.params);

					// const activePackageFree = await ctx.call(
					// 	"transactions.addTransaction",
					// 	{
					// 		packageId: this.settings.PACKAGE_ID_FREE,
					// 		userId: user._id,
					// 	}
					// );
					return {
						success: true,
						code: 200,
						user: {
							userName: user.userName,
							password: user.password,
						},
					};
				}
			},
		},
		login: {
			rest: "POST /login",
			params: {
				email: { type: "email", required: true, trim: true },
				password: { type: "string", required: true, min: 4 },
			},
			async handler(ctx) {
				const user = await this.adapter.findOne({
					email: ctx.params.email,
				});
				if (!user) {
					throw new MoleculerClientError("Email not exist", 400, "", {
						message: "Email not exist",
					});
				}
				const check = await bcrypt.compare(
					ctx.params.password,
					user.password
				);
				if (!check) {
					throw new MoleculerClientError(
						"Password not  correct",
						400,
						"",
						{
							message: "Password not  correct",
						}
					);
				}
				return {
					success: true,
					code: 200,
					user: {
						token: this.generateToken({
							userId: user._id,
							userName: user.userName,
							role: "user",
						}),
					},
				};
			},
		},
		forgotPassword: {
			rest: "POST /forgot",
			params: {
				email: { type: "email", required: true, trim: true },
			},
			async handler(ctx) {
				const email = ctx.params.email;
				const user = await this.adapter.findOne({ email: email });
				if (!user) {
					throw Error("User not found");
				}
				//send email with token
				let token = await bcrypt.hash(
					user.email,
					parseInt(process.env.BCRYPT_SALT_ROUNDS)
				);
				let response = await this.broker.call("mailer.send", {
					to: user.email,
					subject: "RESET PASSWORD",
					html: `<a href="${process.env.APP_URL}/api/user/resetPassword?email=${user.email}&token=${token}"> CLICK HERE TO RESET PASSWORD </a>`,
				});
				if (!response) {
					return Promise.reject(
						new MoleculerClientError("send mail failed", 400, "", {
							message: "failed to send",
						})
					);
				} else {
					return {
						success: true,
						code: 200,
						message: "check your email to reset password",
					};
				}
			},
		},
		getInfo: {
			auth: "required",
			auth: "user",
			rest: "GET /get",
			// cache: true,
			async handler(ctx) {
				return ctx.meta.user;
			},
		},
		resetPassword: {
			rest: "POST /resetPassword",
			async handler(ctx) {
				const check = bcrypt.compare(
					ctx.params.email,
					ctx.params.token
				);
				if (!check) {
					return {
						success: false,
						code: 401,
						message: "back form forgot password",
					};
				} else {
					return {
						success: true,
						code: 200,
						message:
							"show form update password for user with action update-password",
					};
				}
			},
		},
		sendMail: {
			rest: "GET /sendEmail",
			params: {
				to: { type: "email", required: true },
				subject: { type: "string", required: true },
				html: { type: "string", required: true },
			},
			async handler(ctx) {
				let hash = await bcrypt.hash(
					ctx.params.to,
					parseInt(process.env.BCRYPT_SALT_ROUNDS)
				);
				let response = await this.broker.call("mailer.send", {
					to: ctx.params.to,
					subject: ctx.params.subject,
					html: `<a href="${process.env.APP_URL}/api/user/verifyACC?email=${ctx.params.to}&token=${hash}"> Verify email</a>`,
				});
				console.log("response: " + response);
				if (!response) {
					return Promise.reject(
						new MoleculerClientError("send mail failed", 400, "", {
							message: "failed to send",
						})
					);
				}
				return {
					success: true,
					code: 200,
				};
			},
		},
		getInfoPackageUserBuy: {
			rest: "GET /info-package-user-buy/:userId",
			auth: "required",
			role: "user",
			async handler(ctx) {
				let totalToken = 0;
				let expired = 0;
				const transactions = await ctx.call(
					"transactions.getTransactionsForUserId",
					{
						userId: ctx.params.userId,
					}
				);
				transactions.map((item) => {
					totalToken += item.quantityToken;
					if (item.packageId === this.settings.PACKAGE_ID_FREE) {
						expired += 7;
					} else {
						expired += 30;
					}
				});

				return {
					totalToken: totalToken,
					expired: expired,
				};
			},
		},
	},
	methods: {
		generateToken(data) {
			return jwt.sign(data, this.settings.JWT_SECRET, {
				expiresIn: "3days",
			});
		},
		sendForgotPass(user) {
			const link = `${this.settings.DOMAIN_NAME}/api/resetPassword?email=${user.email}&token=${user.reset_token}}`;
			const context = {
				link,
				fullName: user.userName,
			};
			const subject = "DAT LAI MAT KHAU";
			const payload = {
				to: user.email,
				subject: "DAT LAI MAT KHAU",
				html: context,
			};
			this.broker.call("mailer.send", payload);
		},
	},
};
