

// Use global 'marked' loaded via CDN
declare const marked: { parse: (md: string) => string; };

interface MarkdownCacheEntry {
  content: string;
  refCount: number;
}
const markdownCache: Record<string, MarkdownCacheEntry> = {};

interface ChildDefinition {
  type: string;
  content: string;
}
interface ObjectDefinition {
  children: ChildDefinition[];
}
interface Effect {
  take_type: string;
  parent_effect: string | Record<string, string | string[]>;
  child_label_triggers: string[];
  child_object_triggers: string[];
}

type ObjectsDict = Record<string, ObjectDefinition>;
let _idCounter = 0;
const allButtons: Record<number, ButtonNode> = {};
let objectsDict: ObjectsDict = {};
let labelsDict: Record<string, string[]> = {};
let categoriesDict: Record<string, string> = {};
let takeEffects: Record<string, Effect[]> = {};
const inventory: ButtonNode[] = [];

function getNextId(): number {
  const id = _idCounter;
  _idCounter += 1;
  return id;
}

class ButtonNode {
  fullPath: string[];
  id: number;
  fatherId: number;
  type: string;
  expanded: boolean;
  childrenButtons: ButtonNode[];
  childrenButtonIds: number[];
  childrenDefs: ChildDefinition[];
  childrenGenerated: boolean;
  display_name: string;
  labels: string[] = [];
  category: string;
  div?: HTMLDivElement;

  constructor(type: string, expanded: boolean = false, fatherId: number = -1) {
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
function generateChildren(button: ButtonNode): void {
  const definition = objectsDict[button.type];
  const childDefs: ChildDefinition[] = definition ? definition.children : [];
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

function createButtonElement(button: ButtonNode): HTMLDivElement {

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
//TODO: currently we redraw everything,
//this also includes deleting from cache and reloading every time a single markdown exists
//FIX: catch first draw en keep in cache most of it, only delete the necessary
function fillButtonElement(button: ButtonNode): void {
  const baseDiv = button.div;
  if (!baseDiv) {
    return;
  }

    // remove and cleanup file markdown elements from the div, to re-render from scratch
    const oldMdDivs = baseDiv.querySelectorAll('.markdown[data-md-file]');
    oldMdDivs.forEach(mdDiv => {
      const fname = mdDiv.getAttribute('data-md-file');
      if (fname && markdownCache[fname]) {
        markdownCache[fname].refCount--;
        if (markdownCache[fname].refCount <= 0) {
          delete markdownCache[fname];
        }
      }
    });
    // remove everything from the div, so we can re-render it from scratch
    while (baseDiv.firstChild) {
      baseDiv.removeChild(baseDiv.firstChild);
    }
    baseDiv.classList.remove("leaf");


  // add click event so it can be expanded/collapsed via handleClick
  const link = document.createElement("a");
  link.className = "buttonLink";
  link.href = "#" + button.fullPath.join("/");
  link.title = "Click!"
  link.textContent = button.display_name;
  link.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
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
    saveLink.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
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
    labelSpan.title = "Label"
    baseDiv.appendChild(labelSpan);
  }

  // Drop target so an inventory item can be dragged onto this button.
  // add link icon to copy deep link
  const copyLink = document.createElement("span");
  copyLink.className = "linkIcon";
  copyLink.title = "Copy link to clipboard"
  copyLink.textContent = "🔗";
  copyLink.addEventListener("click", (event: MouseEvent) => {
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
    dropTarget.addEventListener("click", (event: MouseEvent) => event.preventDefault());
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
    } else {
      let tabIdx = 0;
      for (const childDef of button.childrenDefs) {
        if (childDef.type === "tab") { //handle new buttons
          const childNode = button.childrenButtons[tabIdx++];
          const childEl = createButtonElement(childNode);
          baseDiv.appendChild(childEl);
        }
        else if (childDef.type === "markdown") { //handle markdown
                  const mdDiv = document.createElement("div");
                  mdDiv.className = "markdown";
                  const content = childDef.content;
                  if (content.endsWith('.md')) { //load file when content ends in .md
                    const fname = content;
                    mdDiv.setAttribute('data-md-file', fname);
                    if (markdownCache[fname]) { //cache entry
                      markdownCache[fname].refCount++;
                      mdDiv.innerHTML = marked.parse(markdownCache[fname].content);
                    } else { //no hit -> load it in
                      markdownCache[fname] = { content: '', refCount: 1 };
                      mdDiv.textContent = 'Loading...';
                      fetch(`objects/markdown/${encodeURIComponent(fname)}`, { cache: 'no-store' })
                        .then(resp => {
                          if (!resp.ok) throw new Error(`Failed to load ${fname}: ${resp.status}`);
                          return resp.text();
                        })
                        .then(text => {
                          if (markdownCache[fname]) {
                            markdownCache[fname].content = text;
                            mdDiv.innerHTML = marked.parse(text);
                          }
                        })
                        .catch(err => {
                          mdDiv.textContent = ` ${fname} is currently unavailable due to maintenance.`;
                        });
                    }
                  } else { //content doenst end in .md so parse as markdown itself
                    mdDiv.innerHTML = marked.parse(content);
                  }
                  const link = document.createElement("a"); 
                  link.className = "buttonLink";
                  link.href = "#" + button.fullPath.join("/");
                  link.title = "Click!"
                  link.textContent = button.display_name;
                  link.addEventListener("click", (event: MouseEvent) => { //add empty click event to stop toggle of parent
                    event.stopPropagation();
                    event.preventDefault();
                  });
                  baseDiv.appendChild(mdDiv);
                } 
        else if (childDef.type === "game") {
          // render game link inline
          const gameDiv = document.createElement("div");
          gameDiv.className = "game";
          gameDiv.innerHTML = childDef.content;
          const innerLink = gameDiv.querySelector("a");
          if (innerLink) innerLink.style.color = "white";
          baseDiv.appendChild(gameDiv);
        } else {
          console.warn(`Unknown child type: ${childDef.type}`);
        }
      }
    }
  }
}

/** Toggles expand/collapse for a button and re-renders it in place. */
function ToggleButtonExpanded(id: number): void {
  const button = allButtons[id];
  if (!button) {
    return;
  }
  button.expanded = !button.expanded;
  fillButtonElement(button);
}

//effects
function transformTakeEffect(father: ButtonNode, child: ButtonNode): void {
  const father_effects = takeEffects[father.type] || [];
  const effect_type_priority_map: Record<string, number> = {
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
        const parent_effect = father_effect.parent_effect as Record<string, string | string[]>;
        father.display_name = parent_effect["new_name"] as string;
        //TODO: redraw display_name
        father.labels = father.labels.concat(parent_effect["add_labels"] as string[]);
        father.labels = father.labels.filter(label => !(parent_effect["remove_labels"] as string[]).includes(label));
      }
      else if (father_effect.take_type === "kill") {
        const grand_father = allButtons[father.fatherId];
        takeFromFather(grand_father, father);
      }
      else if (father_effect.take_type === "transform") {
        const grand_father = allButtons[father.fatherId];
        const parent_effect = father_effect.parent_effect as string;
        const transformed_father = new ButtonNode(parent_effect, false, grand_father.id);
        fillButtonElement(grand_father);
        //remove the old father from the DOM, can still be accesed via allObjects if id is known
        father.div?.remove();
        father.div = undefined;
        father.fatherId = -1;
        father.expanded = false;
        grand_father.childrenButtons = grand_father.childrenButtons.filter(child => child.id !== father.id);
        grand_father.childrenButtonIds = grand_father.childrenButtonIds.filter(childId => childId !== father.id);


      }
      else if (father_effect.take_type === "exposure") {
        const parent_effect = father_effect.parent_effect as Record<string, string[]>;
        for (const new_child_type of parent_effect["hidden_children"] as string[]) {
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

function takeFromFather(father: ButtonNode, button: ButtonNode): void {
  // sync childrenDefs and childrenButtonIds when removing a tab child dynamically
  const idx = father.childrenDefs.findIndex(def => def.type === "tab" && def.content === button.type);
  if (idx >= 0) father.childrenDefs.splice(idx, 1);
  father.childrenButtons = father.childrenButtons.filter(child => child.id !== button.id);
  father.childrenButtonIds = father.childrenButtons.map(child => child.id);
  transformTakeEffect(father, button);
  fillButtonElement(father); // lets the father flip back into a "leaf" if it has no children left
}

// --- Inventory: saving a button out of the tree ---------------------------

/** Removes a button from the tree, unlinks div,
 *  and stores it as an item in the inventory panel. */
function saveToInventory(id: number): void {
  const button = allButtons[id];
  if (!button || button.fatherId === -1) {
    return; // the root button (or an already-detached button) cannot be saved
  }

  const father = allButtons[button.fatherId];
  if (father) {
    takeFromFather(father, button);
  }
  button.div?.remove();
  button.div = undefined;
  button.fatherId = -1;
  button.expanded = false;

  addToInventory(button);
}

/** Adds a button to the inventory list and wires up drag-and-drop for it. */
function addToInventory(button: ButtonNode): void {
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
  item.addEventListener("mousedown", (event: MouseEvent) => startDrag(event, item, button));
  inventoryDiv.appendChild(item);
}

/** Removes a button from the inventory array and its DOM element. */
function removeFromInventory(button: ButtonNode): void {
  const index = inventory.indexOf(button);
  if (index !== -1) {
    inventory.splice(index, 1);
  }
  document.getElementById("inventory" + button.id)?.remove();
}

// --- Drag-and-drop: moving an inventory item onto a tree button ------------

let currentDropTarget: HTMLElement | null = null;
let currentDropTargetOriginalColor = "";

/** Starts following the mouse with `item` and listens for the drop. */
function startDrag(event: MouseEvent, item: HTMLDivElement, button: ButtonNode): void {
  event.preventDefault();

  const rect = item.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;

  item.classList.add("draggable");
  item.style.width = rect.width + "px";
  item.style.left = rect.left + "px";
  item.style.top = rect.top + "px";

  function onMouseMove(moveEvent: MouseEvent): void {
    item.style.left = moveEvent.clientX - offsetX + "px";
    item.style.top = moveEvent.clientY - offsetY + "px";
    updateDropTargetHighlight(moveEvent.clientX, moveEvent.clientY);
  }

  function onMouseUp(upEvent: MouseEvent): void {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    clearDropTargetHighlight();

    const dropTarget = findDropTarget(upEvent.clientX, upEvent.clientY);
    const receiverId = dropTarget?.dataset.buttonId;
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
function findDropTarget(x: number, y: number): HTMLElement | null {
  const element = document.elementFromPoint(x, y);
  if (!element) {
    return null;
  }
  return element.closest(".button") as HTMLElement | null;
}

//if target changes, clear old highlight and highlight new target
function updateDropTargetHighlight(x: number, y: number): void {
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

function clearDropTargetHighlight(): void {
  if (currentDropTarget) {
    currentDropTarget.style.backgroundColor = currentDropTargetOriginalColor;
    currentDropTarget = null;
  }
}

/** Returns true if the button `candidateId` is nested somewhere under `ancestorId`. */
function isDescendant(candidateId: number, ancestorId: number): boolean {
  let current: ButtonNode | undefined = allButtons[candidateId];
  while (current && current.fatherId !== -1) {
    if (current.fatherId === ancestorId) {
      return true;
    }
    current = allButtons[current.fatherId];
  }
  return false;
}

/** Attaches `incoming` as a new child of `receiver`. Returns false if the drop is rejected. */
function receiveItem(receiver: ButtonNode, incoming: ButtonNode): boolean {
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
]

function init_inventory(): void {
  for (const type of start_inventory_items) {
    const button = new ButtonNode(type, false, -1);
    addToInventory(button);
  }
}

function addDEBUGClickEvents(): void {
  const baseEl = document.getElementById("base");
  if (!baseEl) {
    console.error('Missing "base" element to set debug click events.');
    return;
  }
  baseEl.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // ignore clicks inside markdown blocks so they don’t collapse the section
    if (target.closest('.markdown')) {
      return;
    }

    event.preventDefault();

    const baseDiv = target.closest(".button") as HTMLDivElement | null;
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
function drawFirst(): void {
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
function initialize(): void {
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
            return JSON.parse(text) as ObjectsDict;
          } catch (e) {
            throw new Error("Failed to parse JSON from objects/objects.json: " + (e as Error).message);
          }
        });
      })
      .then((data: ObjectsDict) => {
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
            return JSON.parse(text) as Record<string, string>;
          } catch (e) {
            throw new Error("Failed to parse JSON from objects/categories.json: " + (e as Error).message);
          }
        });
      })
      .then((data: Record<string, string>) => {
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
function deepLinkByPath(pathSegments: string[]): ButtonNode | null {
  let node: ButtonNode = allButtons[0];
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
function scrollToNode(button: ButtonNode): void {
  const el = document.getElementById("Button" + button.id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

/** Handles deep links on load, based on path. */
function handleDeepLink(): void {
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

