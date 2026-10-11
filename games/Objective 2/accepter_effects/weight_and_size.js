
	button.childrenButtons.sort((a, b) => {
		if (a.info.size != b.info.size){ //eerst vergelijken van size
			return b.info.size - a.info.size; //van groot naar klein
		}if (a.info.weight != b.info.weight){ //dan vergelijken van weight
			return b.info.weight - a.info.weight; //van groot naar klein
		} return a.type.localeCompare(b.type); //als laatste vergelijken van strings
	}); 