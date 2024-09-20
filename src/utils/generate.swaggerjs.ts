 import json2yaml from "json2yaml";

interface IExtractedDocStrings {
  tag: string;
  text: Record<string, string> | string;
}

interface IMethods {
  fn: string;
  extractedDocStrings: IExtractedDocStrings[];
}

interface TransformedObject {
  [key: string]: {
    type: string;
    description: string;
    items?: {
      type: string;
    };
  };
}

interface InputObject {
  [key: string]: string;
}

const transformObject = (obj: InputObject): TransformedObject => {
  const result: TransformedObject = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    // Detect 'type:array' format (e.g., string:array, object:array, number:array)
    if (typeof value === "string" && value.includes(":array")) {
      const [type] = value.split(":");
      result[key] = {
        type: "array",
        description: "",
        items: { type },
      };
    } else {
      result[key] = {
        type: value,
        description: "",
      };
    }
  });
  return result;
};

const extractStatusCode = (tag: string): string => {
  const match = tag.match(/response(\d+)/);
  return match ? match[1] : "default";
};

const cleanAndParseJson = (text: string): Record<string, any> => {
  try {
    // Clean the input by removing trailing non-JSON characters
    return JSON.parse(text.trim().replace(/(}|\])[^]*$/, "$1"));
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return {};
  }
};

export const genSwaggerJson = (
  url: string,
  methods: IMethods[],
  format: string
) => {
  console.log("Input methods:", JSON.stringify(methods, null, 2));
  const paths: Record<string, any> = {};

  methods.forEach((el) => {
    console.log("\nProcessing route:", el.fn);
    const methodDoc = el.extractedDocStrings.find((doc) => doc.tag === "method");
    const method = methodDoc
      ? (methodDoc.text as string).trim().split(" ")[0].toLowerCase()
      : "";
    const pathParams = el.extractedDocStrings.find((doc) => doc.tag === "path")
      ?.text;
    const queryParams = el.extractedDocStrings.find((doc) => doc.tag === "query")
      ?.text;
    const request = el.extractedDocStrings.find((doc) => doc.tag === "request")
      ?.text;
    const responses: IExtractedDocStrings[] = el.extractedDocStrings.filter((doc) =>
      doc.tag.startsWith("response")
    );

    console.log("Method:", method);
    console.log("Path params:", pathParams);
    console.log("Query params:", queryParams);
    console.log("Request:", request);
    console.log("Responses:", responses);

    const parameters: any[] = [];
    let path = `/${el.fn}`;

    if (pathParams && typeof pathParams === "string") {
      const parsedPathParams = cleanAndParseJson(pathParams);
      Object.entries(parsedPathParams).forEach(([name, type]) => {
        path += `/{${name}}`;
        parameters.push({
          name,
          in: "path",
          required: true,
          schema: { type },
        });
      });
    }

    if (queryParams && typeof queryParams === "string") {
      const parsedQueryParams = cleanAndParseJson(queryParams);
      Object.entries(parsedQueryParams).forEach(([name, type]) => {
        parameters.push({
          name,
          in: "query",
          required: true,
          schema: { type },
        });
      });
    }

    console.log("Processed parameters:", parameters);
    console.log("Updated path:", path);

    let requestBody: any = {};
    if (method === "post" && request && typeof request === "string") {
      const parsedRequest = cleanAndParseJson(request);
      requestBody = {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: transformObject(parsedRequest as InputObject),
            },
          },
        },
      };
    }

    console.log("Processed request body:", requestBody);

    const responseSchemas: Record<string, any> = {};
    responses.forEach((res) => {
      const statusCode = extractStatusCode(res.tag);
      let responseContent = {};

      if (typeof res.text === "string") {
        responseContent = cleanAndParseJson(res.text);
      }

      responseSchemas[statusCode] = {
        description: `Description for response with status code: ${statusCode}`,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: transformObject(responseContent as InputObject),
            },
          },
        },
      };
    });

    console.log("Processed response schemas:", responseSchemas);

    if (method) {
      const pathObject: any = {
        summary: `API for route ${el.fn}`,
        responses: responseSchemas,
      };

      if (parameters.length > 0) {
        pathObject.parameters = parameters;
      }

      if (Object.keys(requestBody).length > 0) {
        pathObject.requestBody = requestBody;
      }

      paths[path] = {
        [method]: pathObject,
      };
    }

    console.log("Generated path object:", JSON.stringify(paths[path], null, 2));
  });

  const result = {
    openapi: "3.0.0",
    info: {
      title: "Generated API",
      version: "1.0.0",
    },
    servers: [
      {
        url,
        description: "API base path",
      },
    ],
    paths,
  };

  console.log("Final generated Swagger JSON:", JSON.stringify(result, null, 2));
  if (format === "yaml") {
    return json2yaml.stringify(result);
  }
  return result;
};