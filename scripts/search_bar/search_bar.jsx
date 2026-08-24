import React, {useState, useRef, useEffect} from "react";
import * as style from "./SearchComponent.module.scss";

const Search_bar = () => {
	return (
		<div className={style.container}>
			<input
				className={style.input}
				type="text"
				placeholder="Search Videos..."
			/>
		</div>
	);
};

export default Search_bar;