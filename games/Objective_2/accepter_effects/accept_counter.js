export function sayHello() {
    console.log("Hello from functions.js!");
}

export function add(a, b) {
    return a + b;
}

export class Helper {
	constructor(name) {
		this.name = name;
	}

	greet() {
		return `Hello, ${this.name}!`;
	}
}


const counter_colors = ["white", "yellow", "orange", "green", "blue", "purple", "brown", "black", "rainbow"];


class AcceptCounter extends Accepter {	
	
	static group = ALL_ITEMS;
	
	initialize(button){
		button.specialStyle["backgroundColor"] = counter_colors[1];
	}
	
	on_accept(button){
		updateReceiverColor(button);
	}
}
	
function updateReceiverColor(button){
	if (button.specialStyle["backgroundColor"] === undefined || button.specialStyle["backgroundColor"] === "rainbow"){		
		if (button.specialStyle["backgroundColor"] === "rainbow"){
			alert("button is epic");
		}
		button.specialStyle["backgroundColor"] = "white";
	}else{
		let ogColor = button.specialStyle["backgroundColor"];
		let index = counter_colors.indexOf(ogColor); 
		let nextIndex = (index + 1) % counter_colors.length;
		button.specialStyle["backgroundColor"] = counter_colors[nextIndex];
		button.div.className = "button " + counter_colors[nextIndex];
	}
}