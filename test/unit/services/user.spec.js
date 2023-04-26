"use strict";

const { ServiceBroker, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../../services/users/user.service");

describe("Test 'user' service", () => {
	describe("Test actions", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(TestService);
		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		const record = {
			_id: "123",
			userName: "david",
			email: "example@gmail.com",
			password: "123456",
		};

		describe("Test 'user.register'", () => {
			it("should return with 'data user'", async () => {
				const res = await broker.call("user.register", {
					userName: "david",
					email: "example@gmail.com",
					password: "123456",
				});
				// await broker.call("transactions.addTransaction", {
				// 	packageId: "6440f35399d20105fcdcd28f",
				// 	userId: "123",
				// });
				expect(res).toEqual({
					success: true,
					code: 200,
					user: {
						userName: "david",
						password:
							"$2b$10$e5PeVMZtgpo.yU6GVEr/NuPNVcsRbGYSAGYtBFl2J8v/JAYTLwvzi",
					},
				});
			});
		});
	});
});
