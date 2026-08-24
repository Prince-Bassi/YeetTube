import {create} from "zustand";

const use_video_store = create((set, get) => ({

	fetch_video_data: async (video_id) => {
		try {
			const response = await fetch(`/api/fetch_video_data/${video_id}`, {
				method: "GET"
			});
			const data = await response.json();
			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	},

    incrementView: async (videoId) => {
        try {
            const response = await fetch(`/api/video/${videoId}/view`, {
                method: "POST"
            });
            const data = await response.json();
            return data;
        }
        catch (err) {
            return { success: false, message: err.message };
        }
    },

	upload_video: async (form_data, access_token) => {
		try {
			const response = await fetch("/api/upload_video", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${access_token}`
				},
				body: form_data
			});
			const data = await response.json();
			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	},

	fetch_recommended: async () => {
		try {
			const response = await fetch("/api/fetch_recommended", {
				method: "GET"
			});
			const data = await response.json();
			return data;
		}
		catch (err) {
			return {success: false, message: err.message};
		}
	}
}));

export default use_video_store;