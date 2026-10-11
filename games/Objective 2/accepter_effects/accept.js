

class Effect {
    constructor() {
        // should be string, constant or list of strings
        this.abstract_group = null;
    }
    abstract_initialize() {}
    abstract_on_accept() {}
}

const ALL_ITEMS = ["ALL_ITEMS"];
const SMALLEST = ["electron"];
const INTANGIBLE = ["thought"];

function handle_accept(accepter, received, accepter_effects = []) {
    for (const effect of accepter_effects) {
        if (!effect(accepter, received)) {
            return false; // any effect can stop the accept
        }
    }
    return true;
}

class Accepter extends Effect {
    constructor() {
        super();
        // group is ALL_ITEMS minus INTANGIBLE and SMALLEST
        this.group = ALL_ITEMS.filter(item => !INTANGIBLE.includes(item) && !SMALLEST.includes(item));
        this.childrenButtons = [];
        this.id = this.id || null;
    }

    on_initialize(accepter) {
        // add accept png in html code?
    }

    on_accept(accepter, received) {
        // if this.type is not in group then accept
        if (!this.group.includes(this.type)) {
            this.accept(accepter, received);
            return true;
        }
        return false;
    }

    accept(accepter, received) {
        const button = { fatherId: this.id };
        this.childrenButtons.push(button);
        if (typeof this.updateHtmlElement === "function") {
            this.updateHtmlElement();
        }
    }
}
