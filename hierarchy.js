"use strict";
let _idCounter = 0;
const allButtons = {};
let objectsDict = {};
let labelsDict = {};
let categoriesDict = {};
let takeEffects = {};
const inventory = [];
function getNextId() {
    const id = _idCounter;
    _idCounter += 1;
    return id;
}
class ButtonNode {
    constructor(type, expanded = false, fatherId = -1) {
        this.labels = [];
        this.fullPath = fatherId === -1 ? [type] : [...allButtons[fatherId].fullPath, type];
        this.id = getNextId();
        this.fatherId = fatherId;
        this.type = type;
        this.expanded = expanded;
        this.childrenButtons = [];
        this.childrenButtonIds = [];
        this.childrenDefs = [];
        this.childrenGenerated = false;
        this.display_name = type;
        this.div = undefined;
        this.labels = labelsDict[type] || [];
        this.category = categoriesDict[type] || "Uncategorized";
        allButtons[this.id] = this;
        if (fatherId !== -1) {
            const father = allButtons[fatherId];
            if (!father.childrenButtonIds.includes(this.id)) {
                father.childrenButtons.push(this);
                father.childrenButtonIds.push(this.id);
            }
        }
    }
}
/** Lazily creates the child ButtonNodes for a node the first time it is expanded. */
function generateChildren(button) {
    const definition = objectsDict[button.type];
    const childDefs = definition ? definition.children : [];
    if (!definition) {
        console.warn('No entry found in objects 2 from llm.json for type "' + button.type + '"');
    }
    button.childrenDefs = childDefs;
    // create child ButtonNodes for 'tab' entries, mirroring the original tree logic
    button.childrenButtons = childDefs
        .filter(def => def.type === "tab")
        .map(def => new ButtonNode(def.content, false, button.id));
    button.childrenButtonIds = button.childrenButtons.map(child => child.id);
    button.childrenGenerated = true;
}
/** Creates the (empty) HTML element for a button, then fills it in. */
/** this html element is attached to a button*/
function createButtonElement(button) {
    // FUTURE: if siblings also change on take-effect, redrawing siblings
    // can be implemented by changing to document.find().remove() and redraw all
    if (button.div) {
        return button.div;
    }
    const baseDiv = document.createElement("div");
    baseDiv.id = "Button" + button.id;
    baseDiv.dataset.buttonId = String(button.id);
    baseDiv.className = "button";
    button.div = baseDiv;
    fillButtonElement(button);
    return baseDiv;
}
/** (Re)renders a button's own link, save/drop controls, and its children, if expanded. */
function fillButtonElement(button) {
    const baseDiv = button.div;
    if (!baseDiv) {
        return;
    }
    // remove everything from the div, so we can re-render it from scratch
    while (baseDiv.firstChild) {
        baseDiv.removeChild(baseDiv.firstChild);
    }
    baseDiv.classList.remove("leaf");
    // add click event so it can be expanded/collapsed via handleClick
    const link = document.createElement("a");
    link.className = "buttonLink";
    link.href = "#" + button.fullPath.join("/");
    link.title = "Click!";
    link.textContent = button.display_name;
    link.addEventListener("click", (event) => {
        event.preventDefault();
        ToggleButtonExpanded(button.id);
    });
    baseDiv.appendChild(link);
    // add a save link to the inventory, if this button has a father
    // The root button has no father to return to, so it can't be saved.
    if (button.fatherId !== -1) {
        const saveLink = document.createElement("a");
        saveLink.className = "saveLink";
        saveLink.href = "#";
        saveLink.title = "Save to inventory";
        saveLink.textContent = "\uD83D\uDCBE"; // 💾
        saveLink.addEventListener("click", (event) => {
            event.preventDefault();
            saveToInventory(button.id);
        });
        baseDiv.appendChild(saveLink);
    }
    // add category
    if (button.category !== "Uncategorized") {
        const categorySpan = document.createElement("span");
        categorySpan.className = "category";
        categorySpan.textContent = button.category;
        baseDiv.appendChild(categorySpan);
    }
    // add labels
    for (const label of button.labels) {
        const labelSpan = document.createElement("span");
        labelSpan.className = "label";
        labelSpan.textContent = label;
        labelSpan.title = "Label";
        baseDiv.appendChild(labelSpan);
    }
    // Drop target so an inventory item can be dragged onto this button.
    // add link icon to copy deep link
    const copyLink = document.createElement("span");
    copyLink.className = "linkIcon";
    copyLink.title = "Copy link to clipboard";
    copyLink.textContent = "🔗";
    copyLink.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const url = window.location.origin + window.location.pathname + "#" + button.fullPath.slice(1).join("/");
        navigator.clipboard.writeText(url).then(() => {
            copyLink.title = "Link copied!";
            copyLink.textContent = "✅";
            setTimeout(() => {
                copyLink.title = "Copy link to clipboard";
                copyLink.textContent = "🔗";
            }, 1500);
        });
    });
    baseDiv.appendChild(copyLink);
    // Drop target so an inventory item can be dragged onto this button.
    if (!DEBUG) {
        const dropTarget = document.createElement("a");
        dropTarget.className = "dropper";
        dropTarget.href = "#";
        dropTarget.textContent = "add";
        dropTarget.addEventListener("click", (event) => event.preventDefault());
        baseDiv.appendChild(dropTarget);
    }
    // REFACTORED to drop targets over all div, by changing the drag event
    // if expanded, render the children
    // (children are lazily generated the first time a button is expanded)
    if (button.expanded) {
        if (!button.childrenGenerated) {
            generateChildren(button);
        }
        if (button.childrenDefs.length === 0) {
            baseDiv.classList.add("leaf");
        }
        else {
            let tabIdx = 0;
            for (const childDef of button.childrenDefs) {
                if (childDef.type === "tab") {
                    const childNode = button.childrenButtons[tabIdx++];
                    const childEl = createButtonElement(childNode);
                    baseDiv.appendChild(childEl);
                }
                else if (childDef.type === "markdown") {
                    // render markdown content inline
                    const mdDiv = document.createElement("div");
                    mdDiv.className = "markdown";
                    mdDiv.innerHTML = marked.parse(childDef.content);
                    baseDiv.appendChild(mdDiv);
                }
                else if (childDef.type === "game") {
                    // render game link inline
                    const gameDiv = document.createElement("div");
                    gameDiv.className = "game";
                    gameDiv.innerHTML = childDef.content;
                    const innerLink = gameDiv.querySelector("a");
                    if (innerLink)
                        innerLink.style.color = "white";
                    baseDiv.appendChild(gameDiv);
                }
                else {
                    console.warn(`Unknown child type: ${childDef.type}`);
                }
            }
        }
    }
}
/** Toggles expand/collapse for a button and re-renders it in place. */
function ToggleButtonExpanded(id) {
    const button = allButtons[id];
    if (!button) {
        return;
    }
    button.expanded = !button.expanded;
    fillButtonElement(button);
}
//effects
function transformTakeEffect(father, child) {
    var _a;
    const father_effects = takeEffects[father.type] || [];
    const effect_type_priority_map = {
        "transform": 2,
        "exposure": 3,
        "incomplete": 4,
        "kill": 5
    };
    const sorted_effects = [...father_effects].sort((a, b) => {
        return effect_type_priority_map[a.take_type] - effect_type_priority_map[b.take_type];
    });
    for (const father_effect of sorted_effects) {
        if (father_effect.child_object_triggers.includes(child.type)) {
            if (father_effect.take_type === "incomplete") {
                const parent_effect = father_effect.parent_effect;
                father.display_name = parent_effect["new_name"];
                //TODO: redraw display_name
                father.labels = father.labels.concat(parent_effect["add_labels"]);
                father.labels = father.labels.filter(label => !parent_effect["remove_labels"].includes(label));
            }
            else if (father_effect.take_type === "kill") {
                const grand_father = allButtons[father.fatherId];
                takeFromFather(grand_father, father);
            }
            else if (father_effect.take_type === "transform") {
                const grand_father = allButtons[father.fatherId];
                const parent_effect = father_effect.parent_effect;
                const transformed_father = new ButtonNode(parent_effect, false, grand_father.id);
                fillButtonElement(grand_father);
                //remove the old father from the DOM, can still be accesed via allObjects if id is known
                (_a = father.div) === null || _a === void 0 ? void 0 : _a.remove();
                father.div = undefined;
                father.fatherId = -1;
                father.expanded = false;
                grand_father.childrenButtons = grand_father.childrenButtons.filter(child => child.id !== father.id);
                grand_father.childrenButtonIds = grand_father.childrenButtonIds.filter(childId => childId !== father.id);
            }
            else if (father_effect.take_type === "exposure") {
                const parent_effect = father_effect.parent_effect;
                for (const new_child_type of parent_effect["hidden_children"]) {
                    const new_child = new ButtonNode(new_child_type, false, father.id);
                    // also update definitions for newly exposed children
                    father.childrenDefs.push({ type: "tab", content: new_child_type });
                    father.childrenButtonIds.push(new_child.id);
                }
            }
            return; // only apply first effect found
        }
    }
    return; // Placeholder for future implementation of take effects when removing a button from parent.
}
function takeFromFather(father, button) {
    // sync childrenDefs and childrenButtonIds when removing a tab child dynamically
    const idx = father.childrenDefs.findIndex(def => def.type === "tab" && def.content === button.type);
    if (idx >= 0)
        father.childrenDefs.splice(idx, 1);
    father.childrenButtons = father.childrenButtons.filter(child => child.id !== button.id);
    father.childrenButtonIds = father.childrenButtons.map(child => child.id);
    transformTakeEffect(father, button);
    fillButtonElement(father); // lets the father flip back into a "leaf" if it has no children left
}
// --- Inventory: saving a button out of the tree ---------------------------
/** Removes a button from the tree, unlinks div,
 *  and stores it as an item in the inventory panel. */
function saveToInventory(id) {
    var _a;
    const button = allButtons[id];
    if (!button || button.fatherId === -1) {
        return; // the root button (or an already-detached button) cannot be saved
    }
    const father = allButtons[button.fatherId];
    if (father) {
        takeFromFather(father, button);
    }
    (_a = button.div) === null || _a === void 0 ? void 0 : _a.remove();
    button.div = undefined;
    button.fatherId = -1;
    button.expanded = false;
    addToInventory(button);
}
/** Adds a button to the inventory list and wires up drag-and-drop for it. */
function addToInventory(button) {
    inventory.push(button);
    const inventoryDiv = document.getElementById("inventory");
    if (!inventoryDiv) {
        console.error('Missing "inventory" element to render saved buttons into.');
        return;
    }
    const item = document.createElement("div");
    item.className = "inventoryItem";
    item.id = "inventory" + button.id;
    item.textContent = button.type;
    item.addEventListener("mousedown", (event) => startDrag(event, item, button));
    inventoryDiv.appendChild(item);
}
/** Removes a button from the inventory array and its DOM element. */
function removeFromInventory(button) {
    var _a;
    const index = inventory.indexOf(button);
    if (index !== -1) {
        inventory.splice(index, 1);
    }
    (_a = document.getElementById("inventory" + button.id)) === null || _a === void 0 ? void 0 : _a.remove();
}
// --- Drag-and-drop: moving an inventory item onto a tree button ------------
let currentDropTarget = null;
let currentDropTargetOriginalColor = "";
/** Starts following the mouse with `item` and listens for the drop. */
function startDrag(event, item, button) {
    event.preventDefault();
    const rect = item.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    item.classList.add("draggable");
    item.style.width = rect.width + "px";
    item.style.left = rect.left + "px";
    item.style.top = rect.top + "px";
    function onMouseMove(moveEvent) {
        item.style.left = moveEvent.clientX - offsetX + "px";
        item.style.top = moveEvent.clientY - offsetY + "px";
        updateDropTargetHighlight(moveEvent.clientX, moveEvent.clientY);
    }
    function onMouseUp(upEvent) {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        clearDropTargetHighlight();
        const dropTarget = findDropTarget(upEvent.clientX, upEvent.clientY);
        const receiverId = dropTarget === null || dropTarget === void 0 ? void 0 : dropTarget.dataset.buttonId;
        const receiver = receiverId !== undefined ? allButtons[Number(receiverId)] : undefined;
        if (receiver && receiveItem(receiver, button)) {
            removeFromInventory(button);
            return;
        }
        // Drop missed a valid target: snap the item back into the inventory list.
        item.classList.remove("draggable");
        item.style.left = "";
        item.style.top = "";
        item.style.width = "";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}
/** Finds the `.button` element under the given point, if any. */
function findDropTarget(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) {
        return null;
    }
    return element.closest(".button");
}
//if target changes, clear old highlight and highlight new target
function updateDropTargetHighlight(x, y) {
    const target = findDropTarget(x, y);
    if (target === currentDropTarget) {
        return;
    }
    clearDropTargetHighlight();
    if (target) {
        currentDropTarget = target;
        currentDropTargetOriginalColor = target.style.backgroundColor;
        target.style.backgroundColor = "orange";
    }
}
function clearDropTargetHighlight() {
    if (currentDropTarget) {
        currentDropTarget.style.backgroundColor = currentDropTargetOriginalColor;
        currentDropTarget = null;
    }
}
/** Returns true if the button `candidateId` is nested somewhere under `ancestorId`. */
function isDescendant(candidateId, ancestorId) {
    let current = allButtons[candidateId];
    while (current && current.fatherId !== -1) {
        if (current.fatherId === ancestorId) {
            return true;
        }
        current = allButtons[current.fatherId];
    }
    return false;
}
/** Attaches `incoming` as a new child of `receiver`. Returns false if the drop is rejected. */
function receiveItem(receiver, incoming) {
    if (receiver.id === incoming.id) {
        return false;
    }
    if (isDescendant(receiver.id, incoming.id)) {
        return false; // would create a cycle (dropping a button onto its own descendant)
    }
    if (!receiver.childrenGenerated) {
        generateChildren(receiver);
    }
    incoming.fatherId = receiver.id;
    incoming.expanded = false;
    receiver.childrenButtons.push(incoming);
    // sync childrenDefs and childrenButtonIds when adding a tab child dynamically
    receiver.childrenDefs.push({ type: "tab", content: incoming.type });
    receiver.childrenButtonIds.push(incoming.id);
    fillButtonElement(receiver);
    return true;
}
const start_inventory_items = [
    "about"
];
function init_inventory() {
    for (const type of start_inventory_items) {
        const button = new ButtonNode(type, false, -1);
        addToInventory(button);
    }
}
function addDEBUGClickEvents() {
    const baseEl = document.getElementById("base");
    if (!baseEl) {
        console.error('Missing "base" element to set debug click events.');
        return;
    }
    baseEl.addEventListener("click", (event) => {
        event.preventDefault();
        const target = event.target;
        const baseDiv = target.closest(".button");
        if (!baseDiv) {
            return;
        }
        const buttonId = Number(baseDiv.id.replace("Button", ""));
        const button = allButtons[buttonId];
        if (!button) {
            return;
        }
        if (event.ctrlKey) {
            saveToInventory(button.id);
            return;
        }
        ToggleButtonExpanded(button.id);
    });
}
/** Draws the very first ("universe") button into the #base container. */
function drawFirst() {
    const baseEl = document.getElementById("base");
    if (!baseEl) {
        console.error('Missing "base" element to render the button tree into.');
        return;
    }
    const first = new ButtonNode("universe", false, -1);
    baseEl.appendChild(createButtonElement(first));
    init_inventory();
}
/** Fetches Objects/objects 2 from llm.json and kicks off the initial render. */
function initialize() {
    Promise.all([
        fetch(encodeURI("objects/objects.json"), { cache: "no-store" })
            .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load objects/objects.json: " + response.status);
            }
            return response.text().then(text => {
                if (!text) {
                    throw new Error("Empty JSON response for objects/objects.json");
                }
                try {
                    return JSON.parse(text);
                }
                catch (e) {
                    throw new Error("Failed to parse JSON from objects/objects.json: " + e.message);
                }
            });
        })
            .then((data) => {
            objectsDict = data;
        }),
        fetch(encodeURI("objects/categories.json"), { cache: "no-store" })
            .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load objects/categories.json: " + response.status);
            }
            return response.text().then(text => {
                if (!text) {
                    throw new Error("Empty JSON response for objects/categories.json");
                }
                try {
                    return JSON.parse(text);
                }
                catch (e) {
                    throw new Error("Failed to parse JSON from objects/categories.json: " + e.message);
                }
            });
        })
            .then((data) => {
            categoriesDict = data;
        })
    ])
        .then(() => {
        drawFirst();
        if (DEBUG) {
            addDEBUGClickEvents();
        }
        handleDeepLink();
    })
        .catch(error => console.error("Error initializing hierarchy:", error));
}
let only_real_stuff = false;
let DEBUG = true;
/** Expands nodes along the given path segments, returns the final node. */
function deepLinkByPath(pathSegments) {
    let node = allButtons[0];
    for (const seg of pathSegments) {
        if (!node.childrenGenerated) {
            generateChildren(node);
        }
        node.expanded = true;
        fillButtonElement(node);
        const next = node.childrenButtons.find(child => child.type === seg);
        if (!next) {
            return null;
        }
        node = next;
    }
    if (!node.childrenGenerated) {
        generateChildren(node);
    }
    node.expanded = true;
    fillButtonElement(node);
    return node;
}
/** Scrolls element into view if provided. */
function scrollToNode(button) {
    const el = document.getElementById("Button" + button.id);
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
    }
}
/** Handles deep links on load, based on path. */
function handleDeepLink() {
    const slug = window.location.hash.slice(1);
    if (!slug) {
        return;
    }
    const segments = slug.split("/").filter(Boolean);
    const target = deepLinkByPath(segments);
    if (target) {
        scrollToNode(target);
    }
}
window.onload = () => {
    initialize();
};
//# sourceMappingURL=hierarchy.js.map