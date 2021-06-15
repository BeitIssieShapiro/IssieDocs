let arr = [ "a/11.jpg", "a/1.jpg", "a/2.jpg"]

arr.sort((a,b)=> {
    getNumber = (elem)=>{
        let ls = elem.lastIndexOf('/');
        ls = elem.substring(ls+1, elem.length - 4)
        console.log(ls)
        return parseInt(ls);
    }
    return getNumber(a) - getNumber(b);
});
console.log(arr)