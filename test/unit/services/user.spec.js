"use strict";

const { ServiceBroker, Context } = require("moleculer");
const { MoleculerClientError } = require("moleculer").Errors;
const testUserService = require("../../../services/users/user.service");
const transactionService = require("../../../services/transaction/transaction.service");
const packageService = require("../../../services/package/package.service");

describe("Test 'user' service", () => {
	describe("Test actions", () => {
		let broker = new ServiceBroker({ logger: false });
		let userService = broker.createService(testUserService);
		broker.createService(transactionService);
		broker.createService(packageService);
		userService.adapter = {
			find: jest.fn(),
			connect: jest.fn(),
		};
		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		describe("Test 'user.register'", () => {
			it("should return error if email exists", async () => {
				const params = {
					userName: "testUser",
					email: "example@gmail.com",
					password: "123456",
				};
				const res = await userService.adapter.find({
					query: params.email,
					fields: ["email"],
				});
				// console.log(res);
				// expect(res).toEqual({
				// 	success: false,
				// 	code: 400,
				// 	error: {
				// 		name: "MoleculerClientError",
				// 		message: "Email exist",
				// 		data: { message: "Email exist" },
				// 	},
				// });
			});
			it("register user successfully and actives package free for user", async () => {
				const params = {
					userName: "testUser",
					email: "example@gmail.com",
					password: "123456",
				};
				const res = await broker.call("user.register", params);
				const activePackageFree = await broker.call(
					"transactions.addTransaction",
					{
						packageId: "6440f35399d20105fcdcd28f",
						userId: "6445da98cb490e71d06386c0",
					}
				);
				expect(activePackageFree.packageId).toBe(
					"6440f35399d20105fcdcd28f"
				);
				expect(res.success).toBe(true);
				expect(res.code).toBe(200);
				expect(res.user.userName).toBe("testUser");
			});
		});
		describe("test function sum", () => {
			it("sums", async () => {
				const res = await broker.call("user.sum", { a: 4, b: 5 });
				expect(res).toBe(9);
			});
		});
		describe("test action login", () => {
			it("check email exists ", async () => {
				const data = {
					email: "testEmail@gmail.com",
					password: 123456,
				};
				const res = await broker.call("user.login", data);
				expect(res).toEqual({
					success: false,
					code: 400,
					error: {
						name: "MoleculerClientError",
						message: "Email not exist",
						data: { message: "Email not exist" },
					},
				});
			});
		});
	});
});
