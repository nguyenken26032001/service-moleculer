"use strict";
const DbMixin = require("../../mixins/db.mixin");
const ObjectID = require("mongodb").ObjectID;
const jwt = require("jsonwebtoken");
module.exports = {
	name: "transactions",
	mixins: [DbMixin("transactions")], //connect db and connect table services in db
	settings: {
		fields: [
			"_id",
			"userId",
			"packageId",
			"transactionPrice",
			"quantityToken",
			"dateTransition",
			"status",
		],
		entityValidators: {
			userId: "string|min:2",
			numberPackage: "number",
			transactionPrice: "number",
			quantityToken: "number",
			dateTransition: "date",
			status: "string",
		},
	},
	actions: {
		addTransaction: {
			rest: "POST /add",
			auth: "required",
			role: "user",
			// params: {
			// 	packageId: { type: "string", required: true },
			// 	userId: { type: "string", require: true },
			// },
			async handler(ctx) {
				const packageId = ctx.params.packageId;
				const userId = ctx.params.userId;
				const dataPackage = await ctx.call("packages.getPackage", {
					packageId: packageId, // <=> packageId
				});
				const dateTransition = new Date().getTime();
				return this.adapter.insert({
					userId: new ObjectID(userId),
					packageId: packageId,
					transactionPrice: dataPackage.price,
					quantityToken: dataPackage.quantityToken,
					dateTransition: dateTransition,
					status: "success",
				});
			},
		},
		//nghi failed
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
				const dataTransactions = await this.adapter.find({
					query: {
						userId: this.adapter.stringToObjectID(
							ctx.params.userId
						),
					},
				});
				return dataTransactions;
			},
		},
	},
};
