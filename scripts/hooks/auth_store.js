import {create} from "zustand";

const use_auth_store = create((set, get) => ({
	access_token: "",

	register: async (json_data) => {
		try {
			const response = await fetch("/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: json_data
			});
			const data = await response.json();
			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	},

	login: async (json_data) => {
		try {
			const response = await fetch("/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: json_data
			});
			const data = await response.json();

			if (data.success) {
				set({access_token: data.access_token});
			}

			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	},

	logout: async () => {
		try {
			const response = await fetch("/auth/logout", { method: "GET" });
			const data = await response.json();
			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	},

	refresh_token: async () => {
		try {
			const response = await fetch("/auth/refresh_token", { method: "POST" });
			const data = await response.json();

			if (data.access_token) {
				set({access_token: data.access_token});
			}

			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	}
}));

export default use_auth_store;