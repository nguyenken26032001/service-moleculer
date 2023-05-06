"use strict";
const DbMixin = require("../../mixins/db.mixin");
const ObjectID = require("mongodb").ObjectID;
const jwt = require("jsonwebtoken");
module.exports = {
	name: "transactions",
	mixins: [DbMixin("transactions")], //connect db and connect table services in db
	settings: {
		MODE_CHARGE: process.env.MODE_CHARGE,
		MODE_WITH_DRAW: process.env.MODE_WITH_DRAW,
		fields: [
			"_id",
			"userId",
			"packageId",
			"transactionPrice",
			"quantityToken",
			"createdAt",
			"status",
		],
		entityValidators: {
			userId: "string|min:2",
			numberPackage: "number",
			transactionPrice: "number",
			quantityToken: "number",
			createdAt: "number",
			status: "number",
		},
	},
	hooks: {
		beforeCreate: [
			(ctx) => {
				ctx.params.createdAt = Date.now();
			},
		],
	},
	actions: {
		addTransaction: {
			rest: "POST /add",
			auth: "required",
			role: "user",
			async handler(ctx) {
				const packageId = ctx.params.packageId;
				const userId = ctx.params.userId;
				const dataPackage = await ctx.call("packages.getPackage", {
					packageId: packageId, // <=> packageId
				});
				this.adapter.insert({
					userId: userId,
					packageId: packageId,
					transactionPrice: dataPackage.price,
					quantityToken: dataPackage.quantityToken,
					createdAt: new Date().getTime(),
					status: 1,
				});
				const addWallet = {
					userId: userId,
					createdAt: new Date().getTime(),
					expiredDate: dataPackage.expire,
					quantityToken: dataPackage.quantityToken,
					type: dataPackage.packageName,
					mode: this.settings.MODE_CHARGE,
				};
				ctx.emit("wallet.change", addWallet); // event biến động ví token
				ctx.emit("wallet.changeToken", { _id: userId }); // event change token for user
			},
		},
		findOne: {
			params: {
				filter: { type: "object" },
			},
			async handler(ctx) {
				return this.adapter.collection.findOne(ctx.params.filter);
			},
		},
		getTransactionsForUserId: {
			rest: "GET /:userId",
			auth: "required",
			role: "user",
			async handler(ctx) {
				let arrNamePackage = [];
				const dataTransactions = await this.adapter.find({
					query: {
						userId: ctx.params.userId,
					},
				});
				for (let index = 0; index < dataTransactions.length; index++) {
					let packageId = dataTransactions[index].packageId;
					let packageInfo = await ctx.call("packages.getPackage", {
						packageId,
					});
					dataTransactions.forEach((el) => {
						if (el.packageId == packageInfo._id) {
							el.packageName = packageInfo.packageName;
						}
					});
				}

				return dataTransactions;
			},
		},
		getTransaction__test: {
			rest: "GET /getTransaction/:userId",
			auth: "required",
			role: "user",
			async handler(ctx) {
				const dataTransactions = await this.adapter.find({
					query: {
						userId: ctx.params.userId,
					},
				});
				return dataTransactions;
			},
		},
	},
};
