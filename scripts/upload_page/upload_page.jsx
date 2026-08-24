import React from "react";
import use_auth_store from "../hooks/auth_store.js";
import use_video_store from "../hooks/video_store.js";

const Upload_page = () => {
	const {access_token} = use_auth_store();
	const {upload_video} = use_video_store();

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

		const {success, message} = await upload_video(form_data, access_token);
		console.log(message);
	};
	
	return (
		<>
			<form onSubmit={handle_upload_video} encType="multipart/form-data">
				<div>
					<label htmlFor="video_title">Video Title:</label>
					<input type="text" placeholder="Title" name="video_title" required/>
				</div>
				<div>
					<label htmlFor="video_desc">Video Description:</label>
					<textarea name="video_desc"></textarea>
				</div>
				<div>
					<label htmlFor="video">Video File:</label>
					<input type="file" name="video" required/>
				</div>
                <div>
					<label htmlFor="thumbnail">Thumbnail:</label>
					<input type="file" name="thumbnail" />
				</div>
				<button type="submit">Upload</button>
			</form>
		</>
	);
};

export default Upload_page;