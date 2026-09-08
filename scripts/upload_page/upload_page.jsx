import React from "react";
import { useNavigate } from "react-router-dom";
import use_auth_store from "../hooks/auth_store.js";
import use_video_store from "../hooks/video_store.js";
import * as style from "./style.module.scss";

const Upload_page = () => {
    const navigate = useNavigate();
	const { access_token } = use_auth_store();
	const { upload_video } = use_video_store();

	const handle_upload_video = async (event) => {
		event.preventDefault();

		const form = event.target;
		const form_data = new FormData();

		const json_data = JSON.stringify({
			video_title: form.video_title.value,
			video_desc: form.video_desc.value
		});

		form_data.append("video", form.video.files[0]);
		form_data.append("thumbnail", form.thumbnail.files[0]);
		form_data.append("data", json_data);

		const { success, message } = await upload_video(
			form_data,
			access_token
		);

		console.log(message);
	};

    const handleBack = () => {
        const referrer = document.referrer;

        if (referrer && new URL(referrer).origin === window.location.origin) {
            window.history.back();
            
        }
        else {
            navigate("/");
        }
    };

	return (
		<main className={style.uploadPage}>
            <div className={style.backButton} onClick={handleBack}>
                <i className="fa fa-arrow-left" aria-hidden="true"></i>
            </div>
			<section className={style.uploadCard}>
				<div className={style.header}>
					<h1>Upload Video</h1>
					<p>Share your video with everyone.</p>
				</div>

				<form
					onSubmit={handle_upload_video}
					encType="multipart/form-data"
				>
					<div className={style.field}>
						<label htmlFor="video_title">Video Title</label>
						<input
							id="video_title"
							type="text"
							name="video_title"
							placeholder="Enter a title"
							required
						/>
					</div>

					<div className={style.field}>
						<label htmlFor="video_desc">Description</label>
						<textarea
							id="video_desc"
							name="video_desc"
							placeholder="Tell viewers about your video..."
							rows="6"
						/>
					</div>

					<div className={style.fileRow}>
						<div className={`${style.fileBox}`}>
							<div className={style.fileIcon}>▶</div>

							<div className={style.fileInfo}>
								<label htmlFor="video">
									Video File
								</label>
								<span>Select the video you want to upload</span>
							</div>

							<input
								id="video"
								type="file"
								name="video"
								accept="video/*"
								required
							/>
						</div>

						<div className={style.fileBox}>
							<div className={style.fileIcon}>▣</div>

							<div className={style.fileInfo}>
								<label htmlFor="thumbnail">
									Thumbnail
								</label>
								<span>Optional custom thumbnail</span>
							</div>

							<input
								id="thumbnail"
								type="file"
								name="thumbnail"
								accept="image/*"
							/>
						</div>
					</div>

					<button className={style.uploadButton} type="submit">
						Upload Video
					</button>
				</form>
			</section>
		</main>
	);
};

export default Upload_page;