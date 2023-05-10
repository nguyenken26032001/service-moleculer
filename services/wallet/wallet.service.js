"use strict";
const DbMixin = require("../../mixins/db.mixin");
const { broker, Errors } = require("moleculer");
const { MoleculerClientError } = Errors;
module.exports = {
	name: "wallet",
	mixins: [DbMixin("wallet")],
	settings: {
		MODE_CHARGE: process.env.MODE_CHARGE,
		MODE_WITH_DRAW: process.env.MODE_WITH_DRAW,
		fields: [
			"_id",
			"userId",
			"packageId",
			"quantity",
			"expiredDate",
			"type",
			"mode",
			"createdAt",
		],
		entityValidator: {
			userId: "string",
			packageId: "string",
			quantity: "number",
			expiredDate: "number",
			type: "string",
			mode: "string",
			createdAt: "number",
		},
	},
	actions: {
		addTransaction: {
			rest: "POST /add",
			auth: "required",
			params: {
				packageId: { type: "string", required: true },
			},
			async handler(ctx) {
				const packageId = ctx.params.packageId;
				const userId = ctx.meta.user._id;
				//get info package by packageId
				const dataPackage = await ctx.call("packages.getPackage", {
					packageId: packageId, // <=> packageId
				});
				const updateWallet = {
					userId: userId,
					packageId: ctx.params.packageId,
					packageName: dataPackage.packageName,
					quantityToken: dataPackage.quantityToken,
					expiredDate: dataPackage.expire,
					type: dataPackage.packageName,
					mode: this.settings.MODE_CHARGE,
					createdAt: new Date().getTime(),
				};
				await ctx.emit("wallet.change", updateWallet); // event biến động ví token
				await ctx.call("user.updateUserToken", { userId: userId });
			},
		},
		InfoWallet: {
			rest: "GET /info",
			auth: "required",
			async handler(ctx) {
				return this.adapter.find({
					query: {
						userId: ctx.meta.user._id,
					},
				});
			},
		},
		useService: {
			rest: "POST /userService",
			auth: "required",
			params: {
				serviceId: { type: "string", require: true },
				time: { type: "number", require: true },
			},
			async handler(ctx) {
				const dataService = await ctx.call("services.getService", {
					serviceId: ctx.params.serviceId,
				});
				const updateWallet = {
					userId: ctx.meta.user._id,
					serviceId: ctx.params.serviceId,
					serviceName: dataService.serviceName,
					quantityToken: -Math.round(ctx.params.time / 1000),
					createdAt: new Date().getTime(),
					mode: this.settings.MODE_WITH_DRAW,
				};
				await ctx.emit("wallet.changeWithDraw", updateWallet);
				await ctx.call("user.updateUserToken", {
					userId: ctx.meta.user._id,
				});
				return {
					code: 200,
					message: "success",
				};
			},
		},
	},
	events: {
		"wallet.change": {
			async handler(ctx) {
				console.log("into wallet change", ctx.params);
				const addWallet = {
					userId: ctx.params.userId,
					packageId: ctx.params.packageId,
					packageName: ctx.params.packageName,
					quantityToken: ctx.params.quantityToken,
					expiredDate: ctx.params.expiredDate,
					createdAt: ctx.params.createdAt,
					type: ctx.params.type,
					mode: ctx.params.mode,
				};
				// this._create(addWallet);
				await this.adapter.insert(addWallet);
			},
		},
		"wallet.changeWithDraw": {
			async handler(ctx) {
				const addWallet = {
					userId: ctx.params.userId,
					serviceId: ctx.params.serviceId,
					serviceName: ctx.params.serviceName,
					quantityToken: ctx.params.quantityToken,
					createdAt: ctx.params.createdAt,
					mode: ctx.params.mode,
				};
				// this._create(ctx, addWallet);
				await this.adapter.insert(addWallet);
			},
		},
	},
};
