function SubmitSearch() {
	var node1 = document.getElementById("node1").value;
	var relationship = document.getElementById("relationship").value;
    var node2 = document.getElementById("node2").value;
    var result = 
	document.getElementById("outputpane").innerHTML = "MATCH path=(n1 {" + node1 +"})-[]->(n2 {" + node2 + "}) RETURN path";
}