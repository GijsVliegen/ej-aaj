const fs = require('fs');

// Read the JSON file
fs.readFile('objects.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    try {
        // Parse JSON
        let jsonData = JSON.parse(data);
        
        // Create a new object with only the 'children' field
        let filteredData = {};
        for (const key in jsonData) {
            if (jsonData[key].children) {
                filteredData[key] = { children: minimize_children(jsonData[key].children) };
            }
        }

        // Write the new JSON to a file
        fs.writeFile('objects 2 from llm.json', JSON.stringify(filteredData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing the file:', err);
                return;
            }
            console.log('Filtered JSON saved as output.json');
        });
    } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
    }
});

minimize_children = function(children){
    return children.map(child => {
        return child
            .replace(/\d+/g, '') // Remove numbers
            .replace(/[%\[\],]/g, '') // Remove special tokens
            .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
            .trim();
    });
}
