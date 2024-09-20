# Welcome to Swagger-Autogen


## How to use the extension

Swagger-Autogen automatically generates swagger for Azure functions written in JavaScript and TypeScript from JS DocStrings like so:

/**
 * @method GET/POST/PUT/DELETE/PATCH 
 * @query {"query1": "string", "query2": "number"}
 * @path {"param":"boolean"}
 * @request {"userName":"string", "privileges":"number:array"}
 * @response200 {"success":"boolean"}
 * @response400 {"success":"boolean"}
 */

@response{statusCode} is how the extension understands what the response should be for different status codes

For array inputs, the syntax is -> {element-type}:array