import React, {useState, useEffect} from "react";
import {Link} from "react-router-dom";
import use_auth_store from "../hooks/auth_store.js";
import use_video_store from "../hooks/video_store.js";
import Search_bar from "../search_bar/search_bar.jsx";
import * as style from "./style.module.scss";

const Home = () => {
	const {access_token} = use_auth_store();
	const {fetch_recommended} = use_video_store();
	const [recommended, set_recommended] = useState({});

	const handle_fetch_recommended = async () => {
		const {success, message, videos} = await fetch_recommended();
		set_recommended(videos);
	};

	useEffect(() => {
		handle_fetch_recommended();
	}, []);

	return (
		<>
			<header>
                <div className={style.heading_container}>
					<img className={style.logo} src="/Assets/logo.png" alt="Logo" />
					<h2>Cheap YouTube</h2>
                </div>
                <Search_bar />
				{access_token !== "" ?
					<Link to="/upload">Upload</Link> :
					<Link to="/login">Log in</Link>
				}
			</header>
			<section>
				{Array.isArray(recommended) &&
					recommended.map(video => (
						<Link
							key={video._id}
							to={`/video/${video._id}`}
							className={style.videoCard}
						>
							<div className={style.thumbnailWrapper}>
								<img
									src={`/api/thumbnail/${video._id}`}
									alt={video.video_title}
								/>
							</div>

							<div className={style.cardBody}>
								<div className={style.videoTitle}>
									{video.video_title}
								</div>

								<div className={style.videoMeta}>
									<span>{video.views || 0} views</span>
								</div>
							</div>
						</Link>
					))
				}
			</section>
		</>
	);
};

export default Home;