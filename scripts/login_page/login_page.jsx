import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import use_auth_store from "../hooks/auth_store.js";
import * as style from "./style.module.scss";

const Login_page = () => {
	const navigate = useNavigate();
	const [is_login, set_is_login] = useState(true);
	const {login, register} = use_auth_store();

	const handle_login = async (json_data) => {
		const res = await login(json_data);
		
		if (res.success) {
			navigate("/");
		}

		console.log(res.message);
	};

	const handle_register = async (json_data) => {
		const res = await register(json_data);

		if (res.success) {
			handle_login(json_data);
		}

		console.log(res.message);
	};

	const handle_submit = async (event) => {
		event.preventDefault();

		const form_data = new FormData(event.target);
		const json_data = JSON.stringify(Object.fromEntries(form_data));

		if (is_login) {
			handle_login(json_data);
		}
		else {
			handle_register(json_data);
		}
	};

	return (
		<div className={style.auth_container}>
			<div className={style.auth_card}>
        		<h2>{is_login ? "Login" : "Sign Up"}</h2>
				<form onSubmit={handle_submit}>
					{!is_login && (
						<input
							type="text"
							placeholder="Name"
							name="name"
							required
						/>
					)}
					<input
						type="email"
						name="email"
						placeholder="Email"
						required
					/>
					<input
						type="password"
						name="password"
						placeholder="Password"
						required
					/>
					<button type="submit">
						{is_login ? "Login" : "Sign Up"}
					</button>
				</form>
				<p className={style.switch}>
					{is_login ? "Don’t have an account?" : "Already have an account?"}{" "}
					<span onClick={() => set_is_login(!is_login)}>
						{is_login ? "Sign Up" : "Login"}
					</span>
				</p>
			</div>
    	</div>
    );
};

export default Login_page;