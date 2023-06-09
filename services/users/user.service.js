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
		MODE_CHARGE: process.env.MODE_CHARGE,
		MODE_WITH_DRAW: process.env.MODE_WITH_DRAW,
		JWT_SECRET: process.env.JWT_TOKEN,
		DOMAIN_NAME: process.env.DOMAIN_NAME,
		PACKAGE_ID_FREE: process.env.PACKAGE_ID_FREE,
		fields: [
			"_id",
			"userName",
			"email",
			"password",
			"token",
			"expiredDate",
		],
		entityValidator: {
			userName: "string|min:5",
			email: "string|email|unique",
			password: [{ type: "string", min: 4 }],
		},
	},
	actions: {
		register: {
			rest: "POST /register",
			params: {
				userName: { type: "string", required: true, min: 5 },
				email: { type: "email", required: true },
				password: {
					type: "string",
					min: 4,
					required: true,
					min: 4,
					optional: true,
				},
			},
			async handler(ctx) {
				const isExist = await this.adapter.find({
					query: { email: ctx.params.email },
					fields: ["email"],
				});
				if (isExist.length > 0) {
					throw new MoleculerClientError("Email exist", 400, "", {
						message: "Email exist",
					});
				} else {
					let passwordHash = await bcrypt.hash(
						ctx.params.password,
						parseInt(process.env.BCRYPT_SALT_ROUNDS)
					);
					ctx.params.password = passwordHash;
					const object = {
						userName: ctx.params.userName,
						email: ctx.params.email,
						password: passwordHash,
					};
					const user = await this.adapter.insert(object);
					const createdAt = new Date().getTime();
					const userId = JSON.stringify(user._id).slice(1, -1); // delete "" ở 2 đầu chuỗi
					user._id = userId; // gán lại id = string -> gọi event xử lý userId == string
					const addWallet = {
						userId: userId,
						createdAt: createdAt,
						expiredDate: 7,
						quantityToken: 100,
						type: "free",
						mode: this.settings.MODE_CHARGE,
					};
					ctx.emit("wallet.change", addWallet);
					ctx.emit("wallet.changeToken", user);
					return {
						success: true,
						code: 200,
						userName: user.userName,
						email: user.email,
						token: this.generateToken({
							userId: user._id,
							userName: user.userName,
							role: "user",
						}),
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
					userName: user.userName,
					email: user.email,
					token: this.generateToken({
						userId: user._id,
						userName: user.userName,
						role: "user",
					}),
				};
			},
		},
		forgotPassword: {
			rest: "POST /forgot-pass",
			params: {
				email: { type: "email", required: true, trim: true },
			},
			async handler(ctx) {
				const email = ctx.params.email;
				const user = await this.adapter.findOne({ email: email });
				if (!user) {
					throw new MoleculerClientError("User not found", 400);
				}
				// sendMailForgotPass;
				user.reset_token = this.generateToken({
					userId: user._id,
					userName: user.userName,
					email: user.email,
				});
				this.sendMailForgotPass(user); // default send success if email exist
				await this._update(ctx, user);
				return {
					code: 200,
					message: "send mail successfully",
				};
			},
		},
		getInfo: {
			auth: "required",
			auth: "user",
			rest: "GET /get-info",
			async handler(ctx) {
				return ctx.meta.user;
			},
		},
		updateUserInfo: {
			auth: "required",
			auth: "user",
			async handler(ctx) {
				console.log("update ok");
				return this.adapter.updateById(ctx.params.id, {
					$set: {
						token: ctx.params.token,
						expiredDate: ctx.params.expiredDate,
					},
				});
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
		getInfoPackageUserBuy: {
			//no need
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
		getTransactionsLogs: {
			rest: "GET /user-transactions-logs/:userId",
			auth: "required",
			role: "user",
			async handler(ctx) {
				const transactions = await ctx.call(
					"transactions.getTransactionsForUserId",
					{
						userId: ctx.params.userId,
					}
				);
				return transactions;
			},
		},
		changePass: {
			rest: "POST /change-pass",
			params: {
				email: { type: "email" },
				token: { type: "string" },
			},
			async handler(ctx) {
				const email = ctx.params.email;
				const token = ctx.params.token;
				const NewPassword = ctx.params.password;
				const user = await this.adapter.findOne({
					email: email,
					reset_token: token,
				});
				if (!user) {
					throw new MoleculerClientError("USER NOT FOUND", 400);
				}
				user.password = await bcrypt.hash(
					NewPassword,
					parseInt(process.env.BCRYPT_SALT_ROUNDS)
				);
				await this._update(ctx, user);
				return {
					code: 200,
					message: "Password updated successfully",
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
		sendMailForgotPass(user) {
			const link = `<a href="${process.env.APP_URL_CLIENT}/reset-Password?email=${user.email}&token=${user.reset_token}"> CLICK HERE TO RESET PASSWORD </a>`;
			const payload = {
				to: user.email,
				subject: "DAT LAI MAT KHAU",
				html: link,
			};
			this.broker.call("mailer.send", payload);
		},
	},
};
