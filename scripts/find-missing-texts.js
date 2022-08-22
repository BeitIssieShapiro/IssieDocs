var strings = ...



const seen = {};
// first create super-set keys
for (const [key, value] of Object.entries(strings.he)) {
    seen[key] = value;    
}

for (const [key, value] of Object.entries(strings.ar)) {
    seen[key] = value;    
}

for (const [key, value] of Object.entries(strings.en)) {
    seen[key] = value;    
}

console.log("Missing He")
for (const [key, value] of Object.entries(seen)) {
    if (strings.he[key] === undefined) {
        console.log(key);
    }
}

console.log("Missing En")
for (const [key, value] of Object.entries(seen)) {
    if (strings.en[key] === undefined) {
        console.log(key);
    }
}

console.log("Missing Ar")
for (const [key, value] of Object.entries(seen)) {
    if (strings.ar[key] === undefined) {
        console.log(key);
    }
}
