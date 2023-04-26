"use strict";
const DbMixin = require("../../mixins/db.mixin");
const nodemailer = require("nodemailer");
const { EMAIL_USERNAME, EMAIL_PASSWORD } = process.env;
const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	auth: {
		user: EMAIL_USERNAME,
		pass: EMAIL_PASSWORD,
	},
});
module.exports = {
	name: "mailer",
	actions: {
		send: {
			rest: "GET /send",
			async handler(payloads) {
				const mailOptions = {
					from: EMAIL_USERNAME,
					to: payloads.params.to,
					subject: payloads.params.subject,
					html: payloads.params.html,
				};
				return transporter.sendMail(mailOptions).then((data) => {
					if (data.response.includes("OK")) {
						return true;
					} else {
						return false;
					}
				});
			},
		},
	},
};
