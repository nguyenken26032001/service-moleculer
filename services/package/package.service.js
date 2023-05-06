"use strict";
const DbMixin = require("../../mixins/db.mixin");
const ObjectId = require("mongodb").ObjectID;
module.exports = {
	name: "packages",
	mixins: [DbMixin("packages")],
	settings: {
		// fields: ["_id", "packageName", "quantityToken", "expire", "price"],
		entityValidators: {
			packageName: "string|min:4|trim:true",
			quantityToken: "number",
			expire: "number",
			price: "number",
		},
	},
	actions: {
		addPackage: {
			rest: "POST /add",
			//role : admin, auth: required
			params: {
				packageName: { type: "string", required: true },
				quantityToken: { type: "number", required: true },
				expire: { type: "number", required: true },
				price: { type: "number", required: true },
			},
			async handler(ctx) {
				return this.adapter.insert(ctx.params);
			},
		},
		listPackage: {
			rest: "GET /list",
			// auth: "required",
			// role: "admin",
			// cache: true,
			async handler() {
				return this.adapter.find();
			},
		},
		getPackage: {
			rest: "GET /:packageId",
			// auth: "required",
			// role: "admin",
			async handler(ctx) {
				const dataPackage = await this.adapter.findOne({
					// _id: this.adapter.stringToObjectID(ctx.params.packageId),
					_id: new ObjectId(ctx.params.packageId),
				});
				if (!dataPackage) {
					return {
						code: 401,
						message: "Package not found",
					};
				}
				return dataPackage;
			},
		},
	},
};
