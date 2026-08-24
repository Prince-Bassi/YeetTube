import React, {useState, useEffect} from "react";
import {useParams, Link} from "react-router-dom";
import use_video_store from "../hooks/video_store.js";
import * as style from "./style.module.scss";

// const AddForm = React.memo(_AddForm)
// const VideoComponent = React.memo(_VideoComponent);
// const PlaylistComponent = React.memo(_PlaylistComponent);

const Video_page = () => {
	const {id} = useParams();
	const {fetch_video_data, incrementView} = use_video_store();
	const [current_video_data, set_video_data] = useState({});
    const [viewDone, setViewDone] = useState(false);

	const handle_fetch_data = async (id) => {
		const {success, message, video_data} = await fetch_video_data(id);
		set_video_data(video_data);
		console.log(message);
	};

    const handleIncView = async (id) => {
        if (viewDone) return;

        setViewDone(true);
        const {success, message} = await incrementView(id);
        console.log(message);
    };

	useEffect(() => {
		handle_fetch_data(id);
	}, [id]);

	return (
		<>
			<header className={style.homeHeader}>
				<Link to="/" className={style.headingCont}>
					<img className={style.logo} src="/Assets/logo.png" alt="Logo" />
					<h2>Cheap YouTube</h2>
				</Link>
			</header>

			<main className={style.page}>
				<section className={style.videoSection}>
					<div className={style.videoWrapper}>
						<video className={style.video} preload="auto" onPlay={async () => await handleIncView(id)} controls autoPlay >
							<source src={`/api/video/${id}`} />
							Your browser does not support the video tag.
						</video>
					</div>

					<h1 className={style.title}>
						{current_video_data.video_title}
					</h1>

					<div className={style.metaRow}>
						<span>Likes: {current_video_data.likes}</span>
						<span>Dislikes: {current_video_data.dislikes}</span>
					</div>

					<div className={style.uploader}>
						Uploaded by: <strong>{current_video_data.uploaded_by}</strong>
					</div>

					<p className={style.description}>
						{current_video_data.video_desc}
					</p>
				</section>
			</main>
		</>
	);
};

export default Video_page;