"use strict";
const DbMixin = require("../../mixins/db.mixin");
const ObjectID = require("mongodb").ObjectID;
const jwt = require("jsonwebtoken");
module.exports = {
	name: "product",
	mixins: [DbMixin("products")],
	settings: {
		fields: [
			"id",
			"name",
			"image",
			"description",
			"price",
			"quantity",
			"category",
			"created_at",
			"updated_at",
		],
		entityValidator: {
			name: "string|min:4|trim:true",
			image: "string|min:4|trim:true",
			description: "string|trim:true",
			price: "number",
			quantity: "number",
			category: "string",
		},
	},
	actions: {
		addProduct: {
			auth: "required",
			role: "admin",
			rest: "POST /add",
			params: {
				name: { type: "string", required: true },
				image: { type: "string", required: true },
				description: { type: "string", required: true },
				price: { type: "number", required: true },
				quantity: { type: "number", required: true },
				category: { type: "string", required: true },
			},
			async handler(ctx) {
				const result = await this.adapter.insert(ctx.params);
				return result;
			},
		},
		getList: {
			auth: "required",
			role: "user",
			rest: "GET /",
			async handler(ctx) {
				return await this.adapter.find();
			},
		},
		findProduct: {
			auth: "required",
			role: "admin",
			rest: "GET /:id",
			async handler(ctx) {
				return await this.adapter.findById(ctx.params.id);
				return await this.adapter.findOne({
					_id: new ObjectID(ctx.params.id),
				});
			},
		},
		updateProduct: {
			rest: "PUT /update/:id",
			auth: "required",
			role: "admin",
			async handler(ctx) {
				// return ctx.params.id
				return await this.adapter.updateById(ctx.params.id, {
					$set: { ...ctx.params },
				});
				return await this.adapter.updateById(
					this.decodeID(ctx.params.id),
					{ $set: { ...ctx.params } }
				);
			},
		},
		deleteProduct: {
			auth: "required",
			rest: "DELETE /delete/:id",
			role: "admin",

			async handler(ctx) {
				const resultDel = await this.adapter.removeById(ctx.params.id);
				return resultDel;
			},
		},
		callLogin: {
			rest: "GET /callLogin",
			auth: "required",
			role: "admin",
			async handler(ctx) {
				const data = await this.broker.call(
					"user.login",
					{
						email: "kenn71917@gmail.com",
						password: "123456",
					},
					{}
				);
				return (
					"service product call service users.login: " +
					data["user"]["token"]
				);
			},
		},
	},
};
/*
* Document
when you use the service adapter for mongoDB ,
methods  worker with database 
 * find
 * findOne --> parameter objectID ex: {_id: new ObjectId(ctx.params.id)}
 * findById --> parameter id ex: this.adapter.findById(ctx.params.id) //những phương thức tìm kiếm bằng By ID --> chỉ cần truyền trực tiếp id làm đối số là được
 * findByIds
 * count
 * insert --> parameter object values 
 * insertMany
 * insertMany
 * updateById --> parameter this.adapter.updateById(ctx.params.id, { $set: { ...ctx.params }})
 * updateByIds
 * removeById --> parameter is id no ObjectID
 * removeByIds
*/
