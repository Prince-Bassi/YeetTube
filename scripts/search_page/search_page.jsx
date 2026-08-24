import React from "react";
import {useParams} from "react-router-dom";

const Search_page = () => {
	const {query} = useParams();
	return (
		<div>SEARCH</div>
	);
};

export default Search_page;