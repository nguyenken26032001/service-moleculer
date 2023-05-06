"use strict";
const DbMixin = require("../../mixins/db.mixin");
module.exports = {
	name: "wallet",
	mixins: [DbMixin("wallet")],
	settings: {
		MODE_CHARGE: process.env.MODE_CHARGE,
		MODE_WITH_DRAW: process.env.MODE_WITH_DRAW,
		fields: ["_id", "createdAt", "quantity", "type", "mode"],
		entityValidator: {
			createdAt: "number",
			quantity: "number",
			type: "string",
			mode: "string",
		},
	},
	actions: {
		countToken_ExpireDate: {
			rest: "GET /:userId",
			auth: "require",
			async handler(ctx) {
				const walletForUser = await this.adapter.find({
					query: {
						userId: ctx.params.userId,
					},
				});
				let token = 0;
				let expiredDate = 0;
				walletForUser.map((item) => {
					token += item.quantityToken;
					expiredDate += item.expiredDate;
				});
				return {
					totalToken: token,
					expired: expiredDate,
				};
			},
		},
	},
	events: {
		"wallet.change"(ctx) {
			const addWallet = {
				userId: ctx.params.userId,
				createdAt: ctx.params.createdAt,
				expiredDate: ctx.params.expiredDate,
				quantityToken: ctx.params.quantityToken,
				type: ctx.params.type,
				mode: ctx.params.mode,
			};
			this.adapter.insert(addWallet);
		},
		"wallet.changeToken": {
			// service user truyền params == object user để sử  thông tin của user call action phía dưới
			async handler(ctx) {
				//ctx.params== object user full information
				var token = 0;
				var expiredDate = 0;
				const walletForUser = await this.adapter.find({
					query: {
						userId: ctx.params._id,
					},
				});
				walletForUser.forEach((item) => {
					token += item.quantityToken;
					expiredDate += item.expiredDate;
				});
				const changeTokenUser = {
					id: ctx.params._id,
					token: token,
					expiredDate: expiredDate,
				};
				ctx.call("user.updateUserInfo", changeTokenUser);
			},
		},
	},
};
