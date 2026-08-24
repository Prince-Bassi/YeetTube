import React, {useEffect, useState} from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import use_auth_store from "./hooks/auth_store.js";
import Home from "./home/home.jsx";
import Login_page from "./login_page/login_page.jsx";
import Search_page from "./search_page/search_page.jsx";
import Upload_page from "./upload_page/upload_page.jsx";
import Video_page from "./video_page/video_page.jsx";

import "./root.css";

const App_routes = () => {
	const {access_token, refresh_token} = use_auth_store();
	const [loading, setLoading] = useState(true);

	const handle_refresh = async () => {
		const data = await refresh_token();
		if (data.success && data.access_token) {

		}

		setLoading(false);
		console.log(data.message);
	};

	useEffect(() => {
		if (!access_token) {
			handle_refresh();
		}
		else {
			setLoading(false);
		}
	}, []);

	// if (loading) {
	// 	return <div>Loading...</div>
	// }

	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/login" element={<Login_page />} />
			<Route path="/search/:query" element={<Search_page />} />
			<Route path="/upload" element={<Upload_page />} />
			<Route path="/video/:id" element={<Video_page />} />
		</Routes>
	);
};

const App = () => {
	return (
		<Router>
			<App_routes />
		</Router>
	);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);