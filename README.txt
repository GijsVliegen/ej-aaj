Hierarchy - TypeScript dropdown tree renderer
=======================================================

This folder is a from-scratch TypeScript rewrite of the dropdown
tree. It loads the object hierarchy from `hierarchy.json`
and renders it as an expandable/collapsible tree of buttons, with an
inventory panel that supports saving a button out of the tree and
dragging it back onto another button.

Requirements:
	- Node.js + npm (for the TypeScript build)
	- Python 3 (used only to serve the folder over HTTP; any static
	  file server works instead, e.g. `npx http-server`)

One-time setup:
	> cd "Objective 2"
	> npm install

Build the TypeScript into ObjectiveCode_2.js:
	> npm run build
	(or `npm run watch` to recompile automatically on save)

Run the webpage:
	> npm run serve
	Then open http://localhost:8000/Hierarchy.html in a browser.

Using the page:
	- Click a button's name to expand/collapse its children.
	- Click the (save) icon on a button to save it into the inventory
	  panel on the right (the root "universe" button has no save icon,
	  it can't be saved).
	- Drag an item from the inventory panel onto another button's "add"
	  tag to attach it as a new child of that button.