"use strict";
const DbMixin = require("../../mixins/db.mixin");
const ObjectID = require("mongodb").ObjectID;
const jwt = require("jsonwebtoken");
module.exports = {
	name: "services",
	mixins: [DbMixin("services")], //connect db and connect table services in db
	settings: {
		fields: ["_id", "serviceName", "price"],
		entityValidators: {
			serviceName: "string|min:2",
			price: "number",
		},
	},
	actions: {
		async seedDB() {
			await this.adapter.insertMany([
				{ serviceName: "RTMP Server", price: 5 },
				{ serviceName: "Forward stream", price: 4 },
				{ serviceName: "Load comment", price: 3 },
			]);
		},
		addService: {
			rest: "POST /add",
			auth: "required",
			role: "user",
			params: {
				serviceName: { type: "string", required: true },
				price: { type: "number", required: true },
			},
			async handler(ctx) {
				const service = {
					serviceName: ctx.params.serviceName,
					price: ctx.params.price,
				};
				return await this.adapter.insert(ctx.params);
			},
		},
		listServices: {
			rest: "GET /list",
			auth: "required",
			role: "user",
			async handler(ctx) {
				return await this.adapter.find();
			},
		},
	},
};
