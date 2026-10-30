var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// node_modules/abitype/dist/esm/version.js
var version;
var init_version = __esm({
  "node_modules/abitype/dist/esm/version.js"() {
    "use strict";
    version = "1.2.3";
  }
});

// node_modules/abitype/dist/esm/errors.js
var BaseError;
var init_errors = __esm({
  "node_modules/abitype/dist/esm/errors.js"() {
    "use strict";
    init_version();
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = args.cause instanceof _BaseError ? args.cause.details : args.cause?.message ? args.cause.message : args.details;
        const docsPath2 = args.cause instanceof _BaseError ? args.cause.docsPath || args.docsPath : args.docsPath;
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsPath2 ? [`Docs: https://abitype.dev${docsPath2}`] : [],
          ...details ? [`Details: ${details}`] : [],
          `Version: abitype@${version}`
        ].join("\n");
        super(message);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "AbiTypeError"
        });
        if (args.cause)
          this.cause = args.cause;
        this.details = details;
        this.docsPath = docsPath2;
        this.metaMessages = args.metaMessages;
        this.shortMessage = shortMessage;
      }
    };
  }
});

// node_modules/abitype/dist/esm/regex.js
function execTyped(regex, string) {
  const match = regex.exec(string);
  return match?.groups;
}
var bytesRegex, integerRegex, isTupleRegex;
var init_regex = __esm({
  "node_modules/abitype/dist/esm/regex.js"() {
    "use strict";
    bytesRegex = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/;
    integerRegex = /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
    isTupleRegex = /^\(.+?\).*?$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/formatAbiParameter.js
function formatAbiParameter(abiParameter) {
  let type = abiParameter.type;
  if (tupleRegex.test(abiParameter.type) && "components" in abiParameter) {
    type = "(";
    const length = abiParameter.components.length;
    for (let i = 0; i < length; i++) {
      const component = abiParameter.components[i];
      type += formatAbiParameter(component);
      if (i < length - 1)
        type += ", ";
    }
    const result = execTyped(tupleRegex, abiParameter.type);
    type += `)${result?.array || ""}`;
    return formatAbiParameter({
      ...abiParameter,
      type
    });
  }
  if ("indexed" in abiParameter && abiParameter.indexed)
    type = `${type} indexed`;
  if (abiParameter.name)
    return `${type} ${abiParameter.name}`;
  return type;
}
var tupleRegex;
var init_formatAbiParameter = __esm({
  "node_modules/abitype/dist/esm/human-readable/formatAbiParameter.js"() {
    "use strict";
    init_regex();
    tupleRegex = /^tuple(?<array>(\[(\d*)\])*)$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/formatAbiParameters.js
function formatAbiParameters(abiParameters) {
  let params = "";
  const length = abiParameters.length;
  for (let i = 0; i < length; i++) {
    const abiParameter = abiParameters[i];
    params += formatAbiParameter(abiParameter);
    if (i !== length - 1)
      params += ", ";
  }
  return params;
}
var init_formatAbiParameters = __esm({
  "node_modules/abitype/dist/esm/human-readable/formatAbiParameters.js"() {
    "use strict";
    init_formatAbiParameter();
  }
});

// node_modules/abitype/dist/esm/human-readable/formatAbiItem.js
function formatAbiItem(abiItem) {
  if (abiItem.type === "function")
    return `function ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability && abiItem.stateMutability !== "nonpayable" ? ` ${abiItem.stateMutability}` : ""}${abiItem.outputs?.length ? ` returns (${formatAbiParameters(abiItem.outputs)})` : ""}`;
  if (abiItem.type === "event")
    return `event ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
  if (abiItem.type === "error")
    return `error ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
  if (abiItem.type === "constructor")
    return `constructor(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability === "payable" ? " payable" : ""}`;
  if (abiItem.type === "fallback")
    return `fallback() external${abiItem.stateMutability === "payable" ? " payable" : ""}`;
  return "receive() external payable";
}
var init_formatAbiItem = __esm({
  "node_modules/abitype/dist/esm/human-readable/formatAbiItem.js"() {
    "use strict";
    init_formatAbiParameters();
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/signatures.js
function isErrorSignature(signature) {
  return errorSignatureRegex.test(signature);
}
function execErrorSignature(signature) {
  return execTyped(errorSignatureRegex, signature);
}
function isEventSignature(signature) {
  return eventSignatureRegex.test(signature);
}
function execEventSignature(signature) {
  return execTyped(eventSignatureRegex, signature);
}
function isFunctionSignature(signature) {
  return functionSignatureRegex.test(signature);
}
function execFunctionSignature(signature) {
  return execTyped(functionSignatureRegex, signature);
}
function isStructSignature(signature) {
  return structSignatureRegex.test(signature);
}
function execStructSignature(signature) {
  return execTyped(structSignatureRegex, signature);
}
function isConstructorSignature(signature) {
  return constructorSignatureRegex.test(signature);
}
function execConstructorSignature(signature) {
  return execTyped(constructorSignatureRegex, signature);
}
function isFallbackSignature(signature) {
  return fallbackSignatureRegex.test(signature);
}
function execFallbackSignature(signature) {
  return execTyped(fallbackSignatureRegex, signature);
}
function isReceiveSignature(signature) {
  return receiveSignatureRegex.test(signature);
}
var errorSignatureRegex, eventSignatureRegex, functionSignatureRegex, structSignatureRegex, constructorSignatureRegex, fallbackSignatureRegex, receiveSignatureRegex, eventModifiers, functionModifiers;
var init_signatures = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/signatures.js"() {
    "use strict";
    init_regex();
    errorSignatureRegex = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    eventSignatureRegex = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    functionSignatureRegex = /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
    structSignatureRegex = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
    constructorSignatureRegex = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
    fallbackSignatureRegex = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
    receiveSignatureRegex = /^receive\(\) external payable$/;
    eventModifiers = /* @__PURE__ */ new Set(["indexed"]);
    functionModifiers = /* @__PURE__ */ new Set([
      "calldata",
      "memory",
      "storage"
    ]);
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/abiItem.js
var InvalidAbiItemError, UnknownTypeError, UnknownSolidityTypeError;
var init_abiItem = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/abiItem.js"() {
    "use strict";
    init_errors();
    InvalidAbiItemError = class extends BaseError {
      constructor({ signature }) {
        super("Failed to parse ABI item.", {
          details: `parseAbiItem(${JSON.stringify(signature, null, 2)})`,
          docsPath: "/api/human#parseabiitem-1"
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidAbiItemError"
        });
      }
    };
    UnknownTypeError = class extends BaseError {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [
            `Type "${type}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownTypeError"
        });
      }
    };
    UnknownSolidityTypeError = class extends BaseError {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [`Type "${type}" is not a valid ABI type.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSolidityTypeError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js
var InvalidParameterError, SolidityProtectedKeywordError, InvalidModifierError, InvalidFunctionModifierError, InvalidAbiTypeParameterError;
var init_abiParameter = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js"() {
    "use strict";
    init_errors();
    InvalidParameterError = class extends BaseError {
      constructor({ param }) {
        super("Invalid ABI parameter.", {
          details: param
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParameterError"
        });
      }
    };
    SolidityProtectedKeywordError = class extends BaseError {
      constructor({ param, name }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `"${name}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "SolidityProtectedKeywordError"
        });
      }
    };
    InvalidModifierError = class extends BaseError {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidModifierError"
        });
      }
    };
    InvalidFunctionModifierError = class extends BaseError {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`,
            `Data location can only be specified for array, struct, or mapping types, but "${modifier}" was given.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidFunctionModifierError"
        });
      }
    };
    InvalidAbiTypeParameterError = class extends BaseError {
      constructor({ abiParameter }) {
        super("Invalid ABI parameter.", {
          details: JSON.stringify(abiParameter, null, 2),
          metaMessages: ["ABI parameter type is invalid."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidAbiTypeParameterError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/signature.js
var InvalidSignatureError, UnknownSignatureError, InvalidStructSignatureError;
var init_signature = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/signature.js"() {
    "use strict";
    init_errors();
    InvalidSignatureError = class extends BaseError {
      constructor({ signature, type }) {
        super(`Invalid ${type} signature.`, {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidSignatureError"
        });
      }
    };
    UnknownSignatureError = class extends BaseError {
      constructor({ signature }) {
        super("Unknown signature.", {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSignatureError"
        });
      }
    };
    InvalidStructSignatureError = class extends BaseError {
      constructor({ signature }) {
        super("Invalid struct signature.", {
          details: signature,
          metaMessages: ["No properties exist."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidStructSignatureError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/struct.js
var CircularReferenceError;
var init_struct = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/struct.js"() {
    "use strict";
    init_errors();
    CircularReferenceError = class extends BaseError {
      constructor({ type }) {
        super("Circular reference detected.", {
          metaMessages: [`Struct "${type}" is a circular reference.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "CircularReferenceError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js
var InvalidParenthesisError;
var init_splitParameters = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js"() {
    "use strict";
    init_errors();
    InvalidParenthesisError = class extends BaseError {
      constructor({ current, depth }) {
        super("Unbalanced parentheses.", {
          metaMessages: [
            `"${current.trim()}" has too many ${depth > 0 ? "opening" : "closing"} parentheses.`
          ],
          details: `Depth "${depth}"`
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParenthesisError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/cache.js
function getParameterCacheKey(param, type, structs) {
  let structKey = "";
  if (structs)
    for (const struct of Object.entries(structs)) {
      if (!struct)
        continue;
      let propertyKey = "";
      for (const property of struct[1]) {
        propertyKey += `[${property.type}${property.name ? `:${property.name}` : ""}]`;
      }
      structKey += `(${struct[0]}{${propertyKey}})`;
    }
  if (type)
    return `${type}:${param}${structKey}`;
  return `${param}${structKey}`;
}
var parameterCache;
var init_cache = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/cache.js"() {
    "use strict";
    parameterCache = /* @__PURE__ */ new Map([
      // Unnamed
      ["address", { type: "address" }],
      ["bool", { type: "bool" }],
      ["bytes", { type: "bytes" }],
      ["bytes32", { type: "bytes32" }],
      ["int", { type: "int256" }],
      ["int256", { type: "int256" }],
      ["string", { type: "string" }],
      ["uint", { type: "uint256" }],
      ["uint8", { type: "uint8" }],
      ["uint16", { type: "uint16" }],
      ["uint24", { type: "uint24" }],
      ["uint32", { type: "uint32" }],
      ["uint64", { type: "uint64" }],
      ["uint96", { type: "uint96" }],
      ["uint112", { type: "uint112" }],
      ["uint160", { type: "uint160" }],
      ["uint192", { type: "uint192" }],
      ["uint256", { type: "uint256" }],
      // Named
      ["address owner", { type: "address", name: "owner" }],
      ["address to", { type: "address", name: "to" }],
      ["bool approved", { type: "bool", name: "approved" }],
      ["bytes _data", { type: "bytes", name: "_data" }],
      ["bytes data", { type: "bytes", name: "data" }],
      ["bytes signature", { type: "bytes", name: "signature" }],
      ["bytes32 hash", { type: "bytes32", name: "hash" }],
      ["bytes32 r", { type: "bytes32", name: "r" }],
      ["bytes32 root", { type: "bytes32", name: "root" }],
      ["bytes32 s", { type: "bytes32", name: "s" }],
      ["string name", { type: "string", name: "name" }],
      ["string symbol", { type: "string", name: "symbol" }],
      ["string tokenURI", { type: "string", name: "tokenURI" }],
      ["uint tokenId", { type: "uint256", name: "tokenId" }],
      ["uint8 v", { type: "uint8", name: "v" }],
      ["uint256 balance", { type: "uint256", name: "balance" }],
      ["uint256 tokenId", { type: "uint256", name: "tokenId" }],
      ["uint256 value", { type: "uint256", name: "value" }],
      // Indexed
      [
        "event:address indexed from",
        { type: "address", name: "from", indexed: true }
      ],
      ["event:address indexed to", { type: "address", name: "to", indexed: true }],
      [
        "event:uint indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ],
      [
        "event:uint256 indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ]
    ]);
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/utils.js
function parseSignature(signature, structs = {}) {
  if (isFunctionSignature(signature))
    return parseFunctionSignature(signature, structs);
  if (isEventSignature(signature))
    return parseEventSignature(signature, structs);
  if (isErrorSignature(signature))
    return parseErrorSignature(signature, structs);
  if (isConstructorSignature(signature))
    return parseConstructorSignature(signature, structs);
  if (isFallbackSignature(signature))
    return parseFallbackSignature(signature);
  if (isReceiveSignature(signature))
    return {
      type: "receive",
      stateMutability: "payable"
    };
  throw new UnknownSignatureError({ signature });
}
function parseFunctionSignature(signature, structs = {}) {
  const match = execFunctionSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "function" });
  const inputParams = splitParameters(match.parameters);
  const inputs = [];
  const inputLength = inputParams.length;
  for (let i = 0; i < inputLength; i++) {
    inputs.push(parseAbiParameter(inputParams[i], {
      modifiers: functionModifiers,
      structs,
      type: "function"
    }));
  }
  const outputs = [];
  if (match.returns) {
    const outputParams = splitParameters(match.returns);
    const outputLength = outputParams.length;
    for (let i = 0; i < outputLength; i++) {
      outputs.push(parseAbiParameter(outputParams[i], {
        modifiers: functionModifiers,
        structs,
        type: "function"
      }));
    }
  }
  return {
    name: match.name,
    type: "function",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs,
    outputs
  };
}
function parseEventSignature(signature, structs = {}) {
  const match = execEventSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "event" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], {
      modifiers: eventModifiers,
      structs,
      type: "event"
    }));
  return { name: match.name, type: "event", inputs: abiParameters };
}
function parseErrorSignature(signature, structs = {}) {
  const match = execErrorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "error" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "error" }));
  return { name: match.name, type: "error", inputs: abiParameters };
}
function parseConstructorSignature(signature, structs = {}) {
  const match = execConstructorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "constructor" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "constructor" }));
  return {
    type: "constructor",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs: abiParameters
  };
}
function parseFallbackSignature(signature) {
  const match = execFallbackSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "fallback" });
  return {
    type: "fallback",
    stateMutability: match.stateMutability ?? "nonpayable"
  };
}
function parseAbiParameter(param, options) {
  const parameterCacheKey = getParameterCacheKey(param, options?.type, options?.structs);
  if (parameterCache.has(parameterCacheKey))
    return parameterCache.get(parameterCacheKey);
  const isTuple = isTupleRegex.test(param);
  const match = execTyped(isTuple ? abiParameterWithTupleRegex : abiParameterWithoutTupleRegex, param);
  if (!match)
    throw new InvalidParameterError({ param });
  if (match.name && isSolidityKeyword(match.name))
    throw new SolidityProtectedKeywordError({ param, name: match.name });
  const name = match.name ? { name: match.name } : {};
  const indexed = match.modifier === "indexed" ? { indexed: true } : {};
  const structs = options?.structs ?? {};
  let type;
  let components = {};
  if (isTuple) {
    type = "tuple";
    const params = splitParameters(match.type);
    const components_ = [];
    const length = params.length;
    for (let i = 0; i < length; i++) {
      components_.push(parseAbiParameter(params[i], { structs }));
    }
    components = { components: components_ };
  } else if (match.type in structs) {
    type = "tuple";
    components = { components: structs[match.type] };
  } else if (dynamicIntegerRegex.test(match.type)) {
    type = `${match.type}256`;
  } else if (match.type === "address payable") {
    type = "address";
  } else {
    type = match.type;
    if (!(options?.type === "struct") && !isSolidityType(type))
      throw new UnknownSolidityTypeError({ type });
  }
  if (match.modifier) {
    if (!options?.modifiers?.has?.(match.modifier))
      throw new InvalidModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
    if (functionModifiers.has(match.modifier) && !isValidDataLocation(type, !!match.array))
      throw new InvalidFunctionModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
  }
  const abiParameter = {
    type: `${type}${match.array ?? ""}`,
    ...name,
    ...indexed,
    ...components
  };
  parameterCache.set(parameterCacheKey, abiParameter);
  return abiParameter;
}
function splitParameters(params, result = [], current = "", depth = 0) {
  const length = params.trim().length;
  for (let i = 0; i < length; i++) {
    const char = params[i];
    const tail = params.slice(i + 1);
    switch (char) {
      case ",":
        return depth === 0 ? splitParameters(tail, [...result, current.trim()]) : splitParameters(tail, result, `${current}${char}`, depth);
      case "(":
        return splitParameters(tail, result, `${current}${char}`, depth + 1);
      case ")":
        return splitParameters(tail, result, `${current}${char}`, depth - 1);
      default:
        return splitParameters(tail, result, `${current}${char}`, depth);
    }
  }
  if (current === "")
    return result;
  if (depth !== 0)
    throw new InvalidParenthesisError({ current, depth });
  result.push(current.trim());
  return result;
}
function isSolidityType(type) {
  return type === "address" || type === "bool" || type === "function" || type === "string" || bytesRegex.test(type) || integerRegex.test(type);
}
function isSolidityKeyword(name) {
  return name === "address" || name === "bool" || name === "function" || name === "string" || name === "tuple" || bytesRegex.test(name) || integerRegex.test(name) || protectedKeywordsRegex.test(name);
}
function isValidDataLocation(type, isArray) {
  return isArray || type === "bytes" || type === "string" || type === "tuple";
}
var abiParameterWithoutTupleRegex, abiParameterWithTupleRegex, dynamicIntegerRegex, protectedKeywordsRegex;
var init_utils = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/utils.js"() {
    "use strict";
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_splitParameters();
    init_cache();
    init_signatures();
    abiParameterWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    abiParameterWithTupleRegex = /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    dynamicIntegerRegex = /^u?int$/;
    protectedKeywordsRegex = /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/structs.js
function parseStructs(signatures) {
  const shallowStructs = {};
  const signaturesLength = signatures.length;
  for (let i = 0; i < signaturesLength; i++) {
    const signature = signatures[i];
    if (!isStructSignature(signature))
      continue;
    const match = execStructSignature(signature);
    if (!match)
      throw new InvalidSignatureError({ signature, type: "struct" });
    const properties = match.properties.split(";");
    const components = [];
    const propertiesLength = properties.length;
    for (let k = 0; k < propertiesLength; k++) {
      const property = properties[k];
      const trimmed = property.trim();
      if (!trimmed)
        continue;
      const abiParameter = parseAbiParameter(trimmed, {
        type: "struct"
      });
      components.push(abiParameter);
    }
    if (!components.length)
      throw new InvalidStructSignatureError({ signature });
    shallowStructs[match.name] = components;
  }
  const resolvedStructs = {};
  const entries = Object.entries(shallowStructs);
  const entriesLength = entries.length;
  for (let i = 0; i < entriesLength; i++) {
    const [name, parameters] = entries[i];
    resolvedStructs[name] = resolveStructs(parameters, shallowStructs);
  }
  return resolvedStructs;
}
function resolveStructs(abiParameters = [], structs = {}, ancestors = /* @__PURE__ */ new Set()) {
  const components = [];
  const length = abiParameters.length;
  for (let i = 0; i < length; i++) {
    const abiParameter = abiParameters[i];
    const isTuple = isTupleRegex.test(abiParameter.type);
    if (isTuple)
      components.push(abiParameter);
    else {
      const match = execTyped(typeWithoutTupleRegex, abiParameter.type);
      if (!match?.type)
        throw new InvalidAbiTypeParameterError({ abiParameter });
      const { array, type } = match;
      if (type in structs) {
        if (ancestors.has(type))
          throw new CircularReferenceError({ type });
        components.push({
          ...abiParameter,
          type: `tuple${array ?? ""}`,
          components: resolveStructs(structs[type], structs, /* @__PURE__ */ new Set([...ancestors, type]))
        });
      } else {
        if (isSolidityType(type))
          components.push(abiParameter);
        else
          throw new UnknownTypeError({ type });
      }
    }
  }
  return components;
}
var typeWithoutTupleRegex;
var init_structs = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/structs.js"() {
    "use strict";
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_struct();
    init_signatures();
    init_utils();
    typeWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/parseAbiItem.js
function parseAbiItem(signature) {
  let abiItem;
  if (typeof signature === "string")
    abiItem = parseSignature(signature);
  else {
    const structs = parseStructs(signature);
    const length = signature.length;
    for (let i = 0; i < length; i++) {
      const signature_ = signature[i];
      if (isStructSignature(signature_))
        continue;
      abiItem = parseSignature(signature_, structs);
      break;
    }
  }
  if (!abiItem)
    throw new InvalidAbiItemError({ signature });
  return abiItem;
}
var init_parseAbiItem = __esm({
  "node_modules/abitype/dist/esm/human-readable/parseAbiItem.js"() {
    "use strict";
    init_abiItem();
    init_signatures();
    init_structs();
    init_utils();
  }
});

// node_modules/abitype/dist/esm/exports/index.js
var init_exports = __esm({
  "node_modules/abitype/dist/esm/exports/index.js"() {
    "use strict";
    init_formatAbiItem();
    init_parseAbiItem();
  }
});

// node_modules/viem/_esm/utils/abi/formatAbiItem.js
function formatAbiItem2(abiItem, { includeName = false } = {}) {
  if (abiItem.type !== "function" && abiItem.type !== "event" && abiItem.type !== "error")
    throw new InvalidDefinitionTypeError(abiItem.type);
  return `${abiItem.name}(${formatAbiParams(abiItem.inputs, { includeName })})`;
}
function formatAbiParams(params, { includeName = false } = {}) {
  if (!params)
    return "";
  return params.map((param) => formatAbiParam(param, { includeName })).join(includeName ? ", " : ",");
}
function formatAbiParam(param, { includeName }) {
  if (param.type.startsWith("tuple")) {
    return `(${formatAbiParams(param.components, { includeName })})${param.type.slice("tuple".length)}`;
  }
  return param.type + (includeName && param.name ? ` ${param.name}` : "");
}
var init_formatAbiItem2 = __esm({
  "node_modules/viem/_esm/utils/abi/formatAbiItem.js"() {
    "use strict";
    init_abi();
  }
});

// node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "node_modules/viem/_esm/utils/data/isHex.js"() {
    "use strict";
  }
});

// node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "node_modules/viem/_esm/utils/data/size.js"() {
    "use strict";
    init_isHex();
  }
});

// node_modules/viem/_esm/errors/version.js
var version2;
var init_version2 = __esm({
  "node_modules/viem/_esm/errors/version.js"() {
    "use strict";
    version2 = "2.55.2";
  }
});

// node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError2;
var init_base = __esm({
  "node_modules/viem/_esm/errors/base.js"() {
    "use strict";
    init_version2();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath: docsPath2 = "", docsSlug }) => docsPath2 ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath2}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version2}`
    };
    BaseError2 = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath2 = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath: docsPath2 });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath2;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version2;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// node_modules/viem/_esm/errors/abi.js
var AbiDecodingDataSizeTooSmallError, AbiDecodingZeroDataError, AbiEventSignatureEmptyTopicsError, AbiEventSignatureNotFoundError, DecodeLogDataMismatch, DecodeLogTopicsMismatch, InvalidAbiDecodingTypeError, InvalidDefinitionTypeError;
var init_abi = __esm({
  "node_modules/viem/_esm/errors/abi.js"() {
    "use strict";
    init_formatAbiItem2();
    init_base();
    AbiDecodingDataSizeTooSmallError = class extends BaseError2 {
      constructor({ data, params, size: size2 }) {
        super([`Data size of ${size2} bytes is too small for given parameters.`].join("\n"), {
          metaMessages: [
            `Params: (${formatAbiParams(params, { includeName: true })})`,
            `Data:   ${data} (${size2} bytes)`
          ],
          name: "AbiDecodingDataSizeTooSmallError"
        });
        Object.defineProperty(this, "data", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "params", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "size", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.data = data;
        this.params = params;
        this.size = size2;
      }
    };
    AbiDecodingZeroDataError = class extends BaseError2 {
      constructor({ cause } = {}) {
        super('Cannot decode zero data ("0x") with ABI parameters.', {
          name: "AbiDecodingZeroDataError",
          cause
        });
      }
    };
    AbiEventSignatureEmptyTopicsError = class extends BaseError2 {
      constructor({ docsPath: docsPath2 }) {
        super("Cannot extract event signature from empty topics.", {
          docsPath: docsPath2,
          name: "AbiEventSignatureEmptyTopicsError"
        });
      }
    };
    AbiEventSignatureNotFoundError = class extends BaseError2 {
      constructor(signature, { docsPath: docsPath2 }) {
        super([
          `Encoded event signature "${signature}" not found on ABI.`,
          "Make sure you are using the correct ABI and that the event exists on it.",
          `You can look up the signature here: https://4byte.sourcify.dev/?q=${signature}.`
        ].join("\n"), {
          docsPath: docsPath2,
          name: "AbiEventSignatureNotFoundError"
        });
      }
    };
    DecodeLogDataMismatch = class extends BaseError2 {
      constructor({ abiItem, data, params, size: size2 }) {
        super([
          `Data size of ${size2} bytes is too small for non-indexed event parameters.`
        ].join("\n"), {
          metaMessages: [
            `Params: (${formatAbiParams(params, { includeName: true })})`,
            `Data:   ${data} (${size2} bytes)`
          ],
          name: "DecodeLogDataMismatch"
        });
        Object.defineProperty(this, "abiItem", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "data", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "params", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "size", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.abiItem = abiItem;
        this.data = data;
        this.params = params;
        this.size = size2;
      }
    };
    DecodeLogTopicsMismatch = class extends BaseError2 {
      constructor({ abiItem, param }) {
        super([
          `Expected a topic for indexed event parameter${param.name ? ` "${param.name}"` : ""} on event "${formatAbiItem2(abiItem, { includeName: true })}".`
        ].join("\n"), { name: "DecodeLogTopicsMismatch" });
        Object.defineProperty(this, "abiItem", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.abiItem = abiItem;
      }
    };
    InvalidAbiDecodingTypeError = class extends BaseError2 {
      constructor(type, { docsPath: docsPath2 }) {
        super([
          `Type "${type}" is not a valid decoding type.`,
          "Please provide a valid ABI type."
        ].join("\n"), { docsPath: docsPath2, name: "InvalidAbiDecodingType" });
      }
    };
    InvalidDefinitionTypeError = class extends BaseError2 {
      constructor(type) {
        super([
          `"${type}" is not a valid definition type.`,
          'Valid types: "function", "event", "error"'
        ].join("\n"), { name: "InvalidDefinitionTypeError" });
      }
    };
  }
});

// node_modules/viem/_esm/errors/data.js
var SliceOffsetOutOfBoundsError, SizeExceedsPaddingSizeError;
var init_data = __esm({
  "node_modules/viem/_esm/errors/data.js"() {
    "use strict";
    init_base();
    SliceOffsetOutOfBoundsError = class extends BaseError2 {
      constructor({ offset, position, size: size2 }) {
        super(`Slice ${position === "start" ? "starting" : "ending"} at offset "${offset}" is out-of-bounds (size: ${size2}).`, { name: "SliceOffsetOutOfBoundsError" });
      }
    };
    SizeExceedsPaddingSizeError = class extends BaseError2 {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "node_modules/viem/_esm/utils/data/pad.js"() {
    "use strict";
    init_data();
  }
});

// node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, InvalidBytesBooleanError, SizeOverflowError;
var init_encoding = __esm({
  "node_modules/viem/_esm/errors/encoding.js"() {
    "use strict";
    init_base();
    IntegerOutOfRangeError = class extends BaseError2 {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    InvalidBytesBooleanError = class extends BaseError2 {
      constructor(bytes) {
        super(`Bytes value "${bytes}" is not a valid boolean. The bytes array must contain a single byte of either a 0 or 1 value.`, {
          name: "InvalidBytesBooleanError"
        });
      }
    };
    SizeOverflowError = class extends BaseError2 {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/trim.js
function trim(hexOrBytes, { dir = "left" } = {}) {
  let data = typeof hexOrBytes === "string" ? hexOrBytes.replace("0x", "") : hexOrBytes;
  let sliceLength = 0;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[dir === "left" ? i : data.length - i - 1].toString() === "0")
      sliceLength++;
    else
      break;
  }
  data = dir === "left" ? data.slice(sliceLength) : data.slice(0, data.length - sliceLength);
  if (typeof hexOrBytes === "string") {
    if (data.length === 1 && dir === "right")
      data = `${data}0`;
    return `0x${data.length % 2 === 1 ? `0${data}` : data}`;
  }
  return data;
}
var init_trim = __esm({
  "node_modules/viem/_esm/utils/data/trim.js"() {
    "use strict";
  }
});

// node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
function hexToBigInt(hex, opts = {}) {
  const { signed } = opts;
  if (opts.size)
    assertSize(hex, { size: opts.size });
  const value = BigInt(hex);
  if (!signed)
    return value;
  const size2 = (hex.length - 2) / 2;
  const max = (1n << BigInt(size2) * 8n - 1n) - 1n;
  if (value <= max)
    return value;
  return value - BigInt(`0x${"f".padStart(size2 * 2, "f")}`) - 1n;
}
function hexToNumber(hex, opts = {}) {
  const value = hexToBigInt(hex, opts);
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new IntegerOutOfRangeError({
      max: `${Number.MAX_SAFE_INTEGER}`,
      min: `${Number.MIN_SAFE_INTEGER}`,
      signed: opts.signed,
      size: opts.size,
      value: `${value}n`
    });
  return number;
}
var init_fromHex = __esm({
  "node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    "use strict";
    init_encoding();
    init_size();
  }
});

// node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "node_modules/viem/_esm/utils/encoding/toHex.js"() {
    "use strict";
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError2(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    "use strict";
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// node_modules/viem/_esm/utils/hash/keccak256.js
import { keccak_256 } from "@noble/hashes/sha3";
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "node_modules/viem/_esm/utils/hash/keccak256.js"() {
    "use strict";
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/hash/hashSignature.js
function hashSignature(sig) {
  return hash(sig);
}
var hash;
var init_hashSignature = __esm({
  "node_modules/viem/_esm/utils/hash/hashSignature.js"() {
    "use strict";
    init_toBytes();
    init_keccak256();
    hash = (value) => keccak256(toBytes(value));
  }
});

// node_modules/viem/_esm/utils/hash/normalizeSignature.js
function normalizeSignature(signature) {
  let active = true;
  let current = "";
  let level = 0;
  let result = "";
  let valid = false;
  for (let i = 0; i < signature.length; i++) {
    const char = signature[i];
    if (["(", ")", ","].includes(char))
      active = true;
    if (char === "(")
      level++;
    if (char === ")")
      level--;
    if (!active)
      continue;
    if (level === 0) {
      if (char === " " && ["event", "function", ""].includes(result))
        result = "";
      else {
        result += char;
        if (char === ")") {
          valid = true;
          break;
        }
      }
      continue;
    }
    if (char === " ") {
      if (signature[i - 1] !== "," && current !== "," && current !== ",(") {
        current = "";
        active = false;
      }
      continue;
    }
    result += char;
    current += char;
  }
  if (!valid)
    throw new BaseError2("Unable to normalize signature.");
  return result;
}
var init_normalizeSignature = __esm({
  "node_modules/viem/_esm/utils/hash/normalizeSignature.js"() {
    "use strict";
    init_base();
  }
});

// node_modules/viem/_esm/utils/hash/toSignature.js
var toSignature;
var init_toSignature = __esm({
  "node_modules/viem/_esm/utils/hash/toSignature.js"() {
    "use strict";
    init_exports();
    init_normalizeSignature();
    toSignature = (def) => {
      const def_ = (() => {
        if (typeof def === "string")
          return def;
        return formatAbiItem(def);
      })();
      return normalizeSignature(def_);
    };
  }
});

// node_modules/viem/_esm/utils/hash/toSignatureHash.js
function toSignatureHash(fn) {
  return hashSignature(toSignature(fn));
}
var init_toSignatureHash = __esm({
  "node_modules/viem/_esm/utils/hash/toSignatureHash.js"() {
    "use strict";
    init_hashSignature();
    init_toSignature();
  }
});

// node_modules/viem/_esm/utils/hash/toEventSelector.js
var toEventSelector;
var init_toEventSelector = __esm({
  "node_modules/viem/_esm/utils/hash/toEventSelector.js"() {
    "use strict";
    init_toSignatureHash();
    toEventSelector = toSignatureHash;
  }
});

// node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "node_modules/viem/_esm/utils/lru.js"() {
    "use strict";
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key) {
        const value = super.get(key);
        if (super.has(key)) {
          super.delete(key);
          super.set(key, value);
        }
        return value;
      }
      set(key, value) {
        if (super.has(key))
          super.delete(key);
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash2 = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash2[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash2[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
var checksumAddressCache;
var init_getAddress = __esm({
  "node_modules/viem/_esm/utils/address/getAddress.js"() {
    "use strict";
    init_toBytes();
    init_keccak256();
    init_lru();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/data/slice.js
function assertStartOffset(value, start) {
  if (typeof start === "number" && start > 0 && start > size(value) - 1)
    throw new SliceOffsetOutOfBoundsError({
      offset: start,
      position: "start",
      size: size(value)
    });
}
function assertEndOffset(value, start, end) {
  if (typeof start === "number" && typeof end === "number" && size(value) !== end - start) {
    throw new SliceOffsetOutOfBoundsError({
      offset: end,
      position: "end",
      size: size(value)
    });
  }
}
function sliceBytes(value_, start, end, { strict } = {}) {
  assertStartOffset(value_, start);
  const value = value_.slice(start, end);
  if (strict)
    assertEndOffset(value, start, end);
  return value;
}
var init_slice = __esm({
  "node_modules/viem/_esm/utils/data/slice.js"() {
    "use strict";
    init_data();
    init_size();
  }
});

// node_modules/viem/_esm/utils/abi/encodeAbiParameters.js
function getArrayComponents(type) {
  const matches = type.match(/^(.*)\[(\d+)?\]$/);
  return matches ? (
    // Return `null` if the array is dynamic.
    [matches[2] ? Number(matches[2]) : null, matches[1]]
  ) : void 0;
}
var init_encodeAbiParameters = __esm({
  "node_modules/viem/_esm/utils/abi/encodeAbiParameters.js"() {
    "use strict";
  }
});

// node_modules/viem/_esm/errors/cursor.js
var NegativeOffsetError, PositionOutOfBoundsError, RecursiveReadLimitExceededError;
var init_cursor = __esm({
  "node_modules/viem/_esm/errors/cursor.js"() {
    "use strict";
    init_base();
    NegativeOffsetError = class extends BaseError2 {
      constructor({ offset }) {
        super(`Offset \`${offset}\` cannot be negative.`, {
          name: "NegativeOffsetError"
        });
      }
    };
    PositionOutOfBoundsError = class extends BaseError2 {
      constructor({ length, position }) {
        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: "PositionOutOfBoundsError" });
      }
    };
    RecursiveReadLimitExceededError = class extends BaseError2 {
      constructor({ count, limit }) {
        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: "RecursiveReadLimitExceededError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/cursor.js
function createCursor(bytes, { recursiveReadLimit = 8192 } = {}) {
  const cursor = Object.create(staticCursor);
  cursor.bytes = bytes;
  cursor.dataView = new DataView(bytes.buffer ?? bytes, bytes.byteOffset, bytes.byteLength);
  cursor.positionReadCount = /* @__PURE__ */ new Map();
  cursor.recursiveReadLimit = recursiveReadLimit;
  return cursor;
}
var staticCursor;
var init_cursor2 = __esm({
  "node_modules/viem/_esm/utils/cursor.js"() {
    "use strict";
    init_cursor();
    staticCursor = {
      bytes: new Uint8Array(),
      dataView: new DataView(new ArrayBuffer(0)),
      position: 0,
      positionReadCount: /* @__PURE__ */ new Map(),
      recursiveReadCount: 0,
      recursiveReadLimit: Number.POSITIVE_INFINITY,
      assertReadLimit() {
        if (this.recursiveReadCount >= this.recursiveReadLimit)
          throw new RecursiveReadLimitExceededError({
            count: this.recursiveReadCount + 1,
            limit: this.recursiveReadLimit
          });
      },
      assertPosition(position) {
        if (position < 0 || position > this.bytes.length - 1)
          throw new PositionOutOfBoundsError({
            length: this.bytes.length,
            position
          });
      },
      decrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position - offset;
        this.assertPosition(position);
        this.position = position;
      },
      getReadCount(position) {
        return this.positionReadCount.get(position || this.position) || 0;
      },
      incrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position + offset;
        this.assertPosition(position);
        this.position = position;
      },
      inspectByte(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectBytes(length, position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + length - 1);
        return this.bytes.subarray(position, position + length);
      },
      inspectUint8(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectUint16(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 1);
        return this.dataView.getUint16(position);
      },
      inspectUint24(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 2);
        return (this.dataView.getUint16(position) << 8) + this.dataView.getUint8(position + 2);
      },
      inspectUint32(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 3);
        return this.dataView.getUint32(position);
      },
      pushByte(byte) {
        this.assertPosition(this.position);
        this.bytes[this.position] = byte;
        this.position++;
      },
      pushBytes(bytes) {
        this.assertPosition(this.position + bytes.length - 1);
        this.bytes.set(bytes, this.position);
        this.position += bytes.length;
      },
      pushUint8(value) {
        this.assertPosition(this.position);
        this.bytes[this.position] = value;
        this.position++;
      },
      pushUint16(value) {
        this.assertPosition(this.position + 1);
        this.dataView.setUint16(this.position, value);
        this.position += 2;
      },
      pushUint24(value) {
        this.assertPosition(this.position + 2);
        this.dataView.setUint16(this.position, value >> 8);
        this.dataView.setUint8(this.position + 2, value & ~4294967040);
        this.position += 3;
      },
      pushUint32(value) {
        this.assertPosition(this.position + 3);
        this.dataView.setUint32(this.position, value);
        this.position += 4;
      },
      readByte() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectByte();
        this.position++;
        return value;
      },
      readBytes(length, size2) {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectBytes(length);
        this.position += size2 ?? length;
        return value;
      },
      readUint8() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint8();
        this.position += 1;
        return value;
      },
      readUint16() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint16();
        this.position += 2;
        return value;
      },
      readUint24() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint24();
        this.position += 3;
        return value;
      },
      readUint32() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint32();
        this.position += 4;
        return value;
      },
      get remaining() {
        return this.bytes.length - this.position;
      },
      setPosition(position) {
        const oldPosition = this.position;
        this.assertPosition(position);
        this.position = position;
        return () => this.position = oldPosition;
      },
      _touch() {
        if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
          return;
        const count = this.getReadCount();
        this.positionReadCount.set(this.position, count + 1);
        if (count > 0)
          this.recursiveReadCount++;
      }
    };
  }
});

// node_modules/viem/_esm/utils/encoding/fromBytes.js
function bytesToBigInt(bytes, opts = {}) {
  if (typeof opts.size !== "undefined")
    assertSize(bytes, { size: opts.size });
  const hex = bytesToHex(bytes, opts);
  return hexToBigInt(hex, opts);
}
function bytesToBool(bytes_, opts = {}) {
  let bytes = bytes_;
  if (typeof opts.size !== "undefined") {
    assertSize(bytes, { size: opts.size });
    bytes = trim(bytes);
  }
  if (bytes.length > 1 || bytes[0] > 1)
    throw new InvalidBytesBooleanError(bytes);
  return Boolean(bytes[0]);
}
function bytesToNumber(bytes, opts = {}) {
  if (typeof opts.size !== "undefined")
    assertSize(bytes, { size: opts.size });
  const hex = bytesToHex(bytes, opts);
  return hexToNumber(hex, opts);
}
function bytesToString(bytes_, opts = {}) {
  let bytes = bytes_;
  if (typeof opts.size !== "undefined") {
    assertSize(bytes, { size: opts.size });
    bytes = trim(bytes, { dir: "right" });
  }
  return new TextDecoder().decode(bytes);
}
var init_fromBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/fromBytes.js"() {
    "use strict";
    init_encoding();
    init_trim();
    init_fromHex();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/abi/decodeAbiParameters.js
function decodeAbiParameters(params, data) {
  const bytes = typeof data === "string" ? hexToBytes(data) : data;
  const cursor = createCursor(bytes);
  if (size(bytes) === 0 && params.length > 0)
    throw new AbiDecodingZeroDataError();
  if (size(data) && size(data) < 32)
    throw new AbiDecodingDataSizeTooSmallError({
      data: typeof data === "string" ? data : bytesToHex(data),
      params,
      size: size(data)
    });
  let consumed = 0;
  const values = [];
  for (let i = 0; i < params.length; ++i) {
    const param = params[i];
    if (consumed < bytes.length)
      cursor.setPosition(consumed);
    const [data2, consumed_] = decodeParameter(cursor, param, {
      staticPosition: 0
    });
    consumed += consumed_;
    values.push(data2);
  }
  return values;
}
function decodeParameter(cursor, param, { staticPosition }) {
  const arrayComponents = getArrayComponents(param.type);
  if (arrayComponents) {
    const [length, type] = arrayComponents;
    return decodeArray(cursor, { ...param, type }, { length, staticPosition });
  }
  if (param.type === "tuple")
    return decodeTuple(cursor, param, { staticPosition });
  if (param.type === "address")
    return decodeAddress(cursor);
  if (param.type === "bool")
    return decodeBool(cursor);
  if (param.type.startsWith("bytes"))
    return decodeBytes(cursor, param, { staticPosition });
  if (param.type.startsWith("uint") || param.type.startsWith("int"))
    return decodeNumber(cursor, param);
  if (param.type === "string")
    return decodeString(cursor, { staticPosition });
  throw new InvalidAbiDecodingTypeError(param.type, {
    docsPath: "/docs/contract/decodeAbiParameters"
  });
}
function decodeAddress(cursor) {
  const value = cursor.readBytes(32);
  return [checksumAddress(bytesToHex(sliceBytes(value, -20))), 32];
}
function decodeArray(cursor, param, { length, staticPosition }) {
  if (length === null) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    const startOfData = start + sizeOfLength;
    cursor.setPosition(start);
    const length2 = bytesToNumber(cursor.readBytes(sizeOfLength));
    const dynamicChild = hasDynamicChild(param);
    let consumed2 = 0;
    const value2 = [];
    for (let i = 0; i < length2; ++i) {
      cursor.setPosition(startOfData + (dynamicChild ? i * 32 : consumed2));
      const [data, consumed_] = decodeParameter(cursor, param, {
        staticPosition: startOfData
      });
      consumed2 += consumed_;
      value2.push(data);
      if (consumed_ === 0) {
        cursor.assertReadLimit();
        cursor._touch();
      }
    }
    cursor.setPosition(staticPosition + 32);
    return [value2, 32];
  }
  if (hasDynamicChild(param)) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    const value2 = [];
    for (let i = 0; i < length; ++i) {
      cursor.setPosition(start + i * 32);
      const [data] = decodeParameter(cursor, param, {
        staticPosition: start
      });
      value2.push(data);
    }
    cursor.setPosition(staticPosition + 32);
    return [value2, 32];
  }
  let consumed = 0;
  const value = [];
  for (let i = 0; i < length; ++i) {
    const [data, consumed_] = decodeParameter(cursor, param, {
      staticPosition: staticPosition + consumed
    });
    consumed += consumed_;
    value.push(data);
    if (consumed_ === 0) {
      cursor.assertReadLimit();
      cursor._touch();
    }
  }
  return [value, consumed];
}
function decodeBool(cursor) {
  return [bytesToBool(cursor.readBytes(32), { size: 32 }), 32];
}
function decodeBytes(cursor, param, { staticPosition }) {
  const [_, size2] = param.type.split("bytes");
  if (!size2) {
    const offset = bytesToNumber(cursor.readBytes(32));
    cursor.setPosition(staticPosition + offset);
    const length = bytesToNumber(cursor.readBytes(32));
    if (length === 0) {
      cursor.setPosition(staticPosition + 32);
      return ["0x", 32];
    }
    const data = cursor.readBytes(length);
    cursor.setPosition(staticPosition + 32);
    return [bytesToHex(data), 32];
  }
  const value = bytesToHex(cursor.readBytes(Number.parseInt(size2, 10), 32));
  return [value, 32];
}
function decodeNumber(cursor, param) {
  const signed = param.type.startsWith("int");
  const size2 = Number.parseInt(param.type.split("int")[1] || "256", 10);
  const value = cursor.readBytes(32);
  return [
    size2 > 48 ? bytesToBigInt(value, { signed }) : bytesToNumber(value, { signed }),
    32
  ];
}
function decodeTuple(cursor, param, { staticPosition }) {
  const hasUnnamedChild = param.components.length === 0 || param.components.some(({ name }) => !name);
  const value = hasUnnamedChild ? [] : {};
  let consumed = 0;
  if (hasDynamicChild(param)) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    for (let i = 0; i < param.components.length; ++i) {
      const component = param.components[i];
      cursor.setPosition(start + consumed);
      const [data, consumed_] = decodeParameter(cursor, component, {
        staticPosition: start
      });
      consumed += consumed_;
      value[hasUnnamedChild ? i : component?.name] = data;
    }
    cursor.setPosition(staticPosition + 32);
    return [value, 32];
  }
  for (let i = 0; i < param.components.length; ++i) {
    const component = param.components[i];
    const [data, consumed_] = decodeParameter(cursor, component, {
      staticPosition
    });
    value[hasUnnamedChild ? i : component?.name] = data;
    consumed += consumed_;
  }
  return [value, consumed];
}
function decodeString(cursor, { staticPosition }) {
  const offset = bytesToNumber(cursor.readBytes(32));
  const start = staticPosition + offset;
  cursor.setPosition(start);
  const length = bytesToNumber(cursor.readBytes(32));
  if (length === 0) {
    cursor.setPosition(staticPosition + 32);
    return ["", 32];
  }
  const data = cursor.readBytes(length, 32);
  const value = bytesToString(trim(data));
  cursor.setPosition(staticPosition + 32);
  return [value, 32];
}
function hasDynamicChild(param) {
  const { type } = param;
  if (type === "string")
    return true;
  if (type === "bytes")
    return true;
  if (type.endsWith("[]"))
    return true;
  if (type === "tuple")
    return param.components?.some(hasDynamicChild);
  const arrayComponents = getArrayComponents(param.type);
  if (arrayComponents && hasDynamicChild({ ...param, type: arrayComponents[1] }))
    return true;
  return false;
}
var sizeOfLength, sizeOfOffset;
var init_decodeAbiParameters = __esm({
  "node_modules/viem/_esm/utils/abi/decodeAbiParameters.js"() {
    "use strict";
    init_abi();
    init_getAddress();
    init_cursor2();
    init_size();
    init_slice();
    init_trim();
    init_fromBytes();
    init_toBytes();
    init_toHex();
    init_encodeAbiParameters();
    sizeOfLength = 32;
    sizeOfOffset = 32;
  }
});

// node_modules/viem/_esm/index.js
init_exports();

// node_modules/viem/_esm/utils/abi/decodeEventLog.js
init_abi();
init_cursor();
init_size();
init_toEventSelector();
init_decodeAbiParameters();
init_formatAbiItem2();
var docsPath = "/docs/contract/decodeEventLog";
function decodeEventLog(parameters) {
  const { abi, data, strict: strict_, topics } = parameters;
  const strict = strict_ ?? true;
  const [signature, ...argTopics] = topics;
  if (!signature)
    throw new AbiEventSignatureEmptyTopicsError({ docsPath });
  const abiItem = abi.find((x) => x.type === "event" && signature === toEventSelector(formatAbiItem2(x)));
  if (!(abiItem && "name" in abiItem) || abiItem.type !== "event")
    throw new AbiEventSignatureNotFoundError(signature, { docsPath });
  const { name, inputs } = abiItem;
  const isUnnamed = inputs?.some((x) => !("name" in x && x.name));
  const args = isUnnamed ? [] : {};
  const indexedInputs = inputs.map((x, i) => [x, i]).filter(([x]) => "indexed" in x && x.indexed);
  const missingIndexedInputs = [];
  for (let i = 0; i < indexedInputs.length; i++) {
    const [param, argIndex] = indexedInputs[i];
    const topic = argTopics[i];
    if (!topic) {
      if (strict)
        throw new DecodeLogTopicsMismatch({
          abiItem,
          param
        });
      missingIndexedInputs.push([param, argIndex]);
      continue;
    }
    args[isUnnamed ? argIndex : param.name || argIndex] = decodeTopic({
      param,
      value: topic
    });
  }
  const nonIndexedInputs = inputs.filter((x) => !("indexed" in x && x.indexed));
  const inputsToDecode = strict ? nonIndexedInputs : [...missingIndexedInputs.map(([param]) => param), ...nonIndexedInputs];
  if (inputsToDecode.length > 0) {
    if (data && data !== "0x") {
      try {
        const decodedData = decodeAbiParameters(inputsToDecode, data);
        if (decodedData) {
          let dataIndex = 0;
          if (!strict) {
            for (const [param, argIndex] of missingIndexedInputs) {
              args[isUnnamed ? argIndex : param.name || argIndex] = decodedData[dataIndex++];
            }
          }
          if (isUnnamed) {
            for (let i = 0; i < inputs.length; i++)
              if (args[i] === void 0 && dataIndex < decodedData.length)
                args[i] = decodedData[dataIndex++];
          } else
            for (let i = 0; i < nonIndexedInputs.length; i++)
              args[nonIndexedInputs[i].name] = decodedData[dataIndex++];
        }
      } catch (err) {
        if (strict) {
          if (err instanceof AbiDecodingDataSizeTooSmallError || err instanceof PositionOutOfBoundsError)
            throw new DecodeLogDataMismatch({
              abiItem,
              data,
              params: inputsToDecode,
              size: size(data)
            });
          throw err;
        }
      }
    } else if (strict) {
      throw new DecodeLogDataMismatch({
        abiItem,
        data: "0x",
        params: inputsToDecode,
        size: 0
      });
    }
  }
  return {
    eventName: name,
    args: Object.values(args).length > 0 ? args : void 0
  };
}
function decodeTopic({ param, value }) {
  if (param.type === "string" || param.type === "bytes" || param.type === "tuple" || param.type.match(/^(.*)\[(\d+)?\]$/))
    return value;
  const decodedArg = decodeAbiParameters([param], value) || [];
  return decodedArg[0];
}

// node_modules/viem/_esm/utils/hash/toEventHash.js
init_toSignatureHash();

// src/subscription/subscription.ts
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var PLAN_CREATED_EVENT = parseAbiItem(
  "event PlanCreated(uint256 indexed planId, uint256 indexed agentId, string name, uint8 planType, address token, uint256 subscriptionPrice, uint256 usagePrice, uint8 billingPeriod, uint256 platformFeePercentage)"
);
var SUBSCRIBED_EVENT = parseAbiItem(
  "event SubscriptionCreated(uint256 indexed subscriptionId, uint256 indexed planId, uint256 indexed agentId, address subscriber, uint8 planType, uint256 startDate, uint256 nextBillingDate)"
);
var PLAN_CREATED_TOPIC = toSignatureHash(PLAN_CREATED_EVENT);
var SUBSCRIBED_TOPIC = toSignatureHash(SUBSCRIBED_EVENT);
var SUBSCRIPTION_ABI_V2 = {
  // Admin
  defaultPlatformFee: {
    inputs: [],
    name: "defaultPlatformFee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  priceOracle: {
    inputs: [],
    name: "priceOracle",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  identityRegistry: {
    inputs: [],
    name: "identityRegistry",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Plans
  createPlan: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "planType", type: "uint8" },
      { name: "token", type: "address" },
      { name: "subscriptionPrice", type: "uint256" },
      { name: "usagePrice", type: "uint256" },
      { name: "billingPeriod", type: "uint8" },
      { name: "maxUsage", type: "uint256" },
      { name: "totalUsageLimit", type: "uint256" }
    ],
    name: "createPlan",
    outputs: [{ name: "planId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  getPlan: {
    inputs: [{ name: "planId", type: "uint256" }],
    name: "getPlan",
    outputs: [{
      type: "tuple",
      components: [
        { name: "planId", type: "uint256" },
        { name: "agentId", type: "uint256" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "planType", type: "uint8" },
        { name: "token", type: "address" },
        { name: "subscriptionPrice", type: "uint256" },
        { name: "usagePrice", type: "uint256" },
        { name: "billingPeriod", type: "uint8" },
        { name: "maxUsage", type: "uint256" },
        { name: "totalUsageLimit", type: "uint256" },
        { name: "isActive", type: "bool" },
        { name: "createdAt", type: "uint256" },
        { name: "platformFeePercentage", type: "uint256" }
      ]
    }],
    stateMutability: "view",
    type: "function"
  },
  // Subscribe
  subscribe: {
    inputs: [{ name: "planId", type: "uint256" }],
    name: "subscribe",
    outputs: [{ name: "subscriptionId", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  // Renew（保持旧版 processPayment 语义：延长同一 subscriptionId）
  processPayment: {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "processPayment",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  cancelSubscription: {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "cancelSubscription",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Queries
  getSubscription: {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "getSubscription",
    outputs: [{
      type: "tuple",
      components: [
        { name: "subscriptionId", type: "uint256" },
        { name: "planId", type: "uint256" },
        { name: "agentId", type: "uint256" },
        { name: "subscriber", type: "address" },
        { name: "status", type: "uint8" },
        { name: "planType", type: "uint8" },
        { name: "startDate", type: "uint256" },
        { name: "nextBillingDate", type: "uint256" },
        { name: "endDate", type: "uint256" },
        { name: "currentPeriodUsage", type: "uint256" },
        { name: "totalUsage", type: "uint256" },
        { name: "remainingUsage", type: "uint256" },
        { name: "totalPaid", type: "uint256" },
        { name: "createdAt", type: "uint256" },
        { name: "lastPaymentDate", type: "uint256" },
        { name: "paymentToken", type: "address" }
      ]
    }],
    stateMutability: "view",
    type: "function"
  },
  hasActiveSubscription: {
    inputs: [
      { name: "subscriber", type: "address" },
      { name: "agentId", type: "uint256" }
    ],
    name: "hasActiveSubscription",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  getUserSubscriptions: {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserSubscriptions",
    outputs: [{
      type: "tuple[]",
      components: [
        { name: "subscriptionId", type: "uint256" },
        { name: "planId", type: "uint256" },
        { name: "agentId", type: "uint256" },
        { name: "subscriber", type: "address" },
        { name: "status", type: "uint8" },
        { name: "planType", type: "uint8" },
        { name: "startDate", type: "uint256" },
        { name: "nextBillingDate", type: "uint256" },
        { name: "endDate", type: "uint256" },
        { name: "currentPeriodUsage", type: "uint256" },
        { name: "totalUsage", type: "uint256" },
        { name: "remainingUsage", type: "uint256" },
        { name: "totalPaid", type: "uint256" },
        { name: "createdAt", type: "uint256" },
        { name: "lastPaymentDate", type: "uint256" },
        { name: "paymentToken", type: "address" }
      ]
    }],
    stateMutability: "view",
    type: "function"
  },
  // Oracle whitelist
  isTokenSupported: {
    inputs: [{ name: "token", type: "address" }],
    name: "isTokenSupported",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Identity owner（PlanDetail.creator 派生）
  ownerOf: {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
};
var ERC20_ABI = {
  approve: {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  allowance: {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
};
var SUBSCRIPTION_STATUS_NAMES = {
  0: "active",
  1: "cancelled",
  2: "expired",
  3: "pending",
  4: "pending"
};
var SUBSCRIPTION_PERIODS = ["day", "week", "month", "quarter", "year"];
var BILLING_PERIOD_NAMES = ["day", "week", "month", "quarter", "year"];
var BILLING_PERIOD_TO_ENUM = {
  day: 0,
  week: 1,
  month: 2,
  quarter: 3,
  year: 4
};
var GRACE_PERIOD_SECONDS = 3 * 24 * 60 * 60;
var SubscriptionManager = class {
  address;
  publicClient;
  walletClient;
  constructor(config) {
    this.address = config.contractAddress;
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
  }
  /**
   * Resolve the caller account for write operations.
   *
   * Prefers `walletClient.account` (a full viem Account object with signing
   * capability) over `getAddresses()[0]` (a bare address string). Passing a
   * bare string as `account` makes viem route `writeContract` through
   * `eth_sendTransaction` (node-managed accounts only), which fails for local
   * signers; the full object enables local signing via `eth_sendRawTransaction`.
   * In browser wallets (e.g. MetaMask) `client.account` is a json-rpc account
   * and the provider signs, so both paths keep working.
   */
  async _resolveAccount() {
    const clientAccount = this.walletClient.account;
    if (clientAccount) return clientAccount;
    const [address] = await this.walletClient.getAddresses();
    if (!address) throw new Error("Wallet not connected");
    return address;
  }
  // ── Config Read ──────────────────────────────────────────────────────────
  /** Get the default platform fee in basis points (250 = 2.5%). Actora currently sets this to 0. */
  async getPlatformFeeBps() {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.defaultPlatformFee],
      functionName: "defaultPlatformFee"
    });
    return Number(result);
  }
  /** Check whether an ERC-20 token is accepted by the plan price oracle. */
  async isTokenWhitelisted(token) {
    const oracle = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.priceOracle],
      functionName: "priceOracle"
    });
    const result = await this.publicClient.readContract({
      address: oracle,
      abi: [SUBSCRIPTION_ABI_V2.isTokenSupported],
      functionName: "isTokenSupported",
      args: [token]
    });
    return result;
  }
  // ── Plans ────────────────────────────────────────────────────────────────
  /** Get full plan details; `creator` is the identity owner of `agentId`. */
  async getPlan(planId) {
    const r = await this._readPlanRaw(planId);
    return {
      planId: Number(r.planId),
      agentId: Number(r.agentId),
      creator: await this._agentOwner(Number(r.agentId)),
      price: r.subscriptionPrice,
      period: BILLING_PERIOD_NAMES[Number(r.billingPeriod)] ?? "month",
      active: r.isActive,
      payToken: r.token,
      trialDays: 0,
      name: r.name,
      description: r.description,
      planType: Number(r.planType),
      subscriptionPrice: r.subscriptionPrice,
      usagePrice: r.usagePrice,
      billingPeriod: Number(r.billingPeriod),
      maxUsage: r.maxUsage,
      totalUsageLimit: r.totalUsageLimit,
      platformFeePercentage: Number(r.platformFeePercentage)
    };
  }
  /**
   * Create a subscription plan for an agent.
   *
   * @param params.period  Must be 'day' | 'week' | 'month' | 'quarter' | 'year'.
   * @returns              { planId, txHash } (planId parsed from PlanCreated event)
   */
  async createPlan(params) {
    const {
      agentId,
      name = `Plan #${agentId}`,
      description = "",
      planType = 0,
      price = 0n,
      usagePrice = 0n,
      period,
      payToken = ZERO_ADDRESS,
      maxUsage = 0n,
      totalUsageLimit = 0n
    } = params;
    const billingPeriod = BILLING_PERIOD_TO_ENUM[period];
    if (billingPeriod === void 0) {
      throw new Error(
        `Invalid period "${period}". Must be one of: ${SUBSCRIPTION_PERIODS.join(", ")}`
      );
    }
    if (planType !== 1 && price <= 0n) {
      throw new Error("price must be > 0 for subscription/hybrid plans");
    }
    if (planType !== 0 && usagePrice <= 0n) {
      throw new Error("usagePrice must be > 0 for usage-based/hybrid plans");
    }
    const account = await this._resolveAccount();
    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.createPlan],
      functionName: "createPlan",
      args: [
        BigInt(agentId),
        name,
        description,
        planType,
        payToken,
        price,
        usagePrice,
        billingPeriod,
        maxUsage,
        totalUsageLimit
      ]
    });
    const hash2 = await this.walletClient.writeContract({ ...request, account });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: hash2 });
    return { planId: this._parsePlanIdFromReceipt(receipt), txHash: hash2 };
  }
  /**
   * Subscribe to a plan.
   * For ETH plans: pass valueWei = plan.price.
   * For ERC20 plans: auto-detects from plan.payToken, calls approve + subscribe.
   *                    User must have approved this contract for plan.price tokens.
   *
   * @returns SubscribeResult — subscriptionId/nextBillingDate/subscriber parsed
   *          from the SubscriptionCreated event (no longer hardcoded to 0).
   */
  async subscribe(planId, opts) {
    const account = await this._resolveAccount();
    const plan = await this.getPlan(planId);
    if (!plan.active) throw new Error("Plan not active");
    if (plan.payToken === ZERO_ADDRESS) {
      const value = opts?.valueWei ?? plan.price;
      const { request } = await this.publicClient.simulateContract({
        account,
        address: this.address,
        abi: [SUBSCRIPTION_ABI_V2.subscribe],
        functionName: "subscribe",
        args: [BigInt(planId)],
        value
      });
      const hash2 = await this.walletClient.writeContract({ ...request, account });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: hash2 });
      return { txHash: hash2, ...this._parseSubscribedFromReceipt(receipt) };
    } else {
      const accountAddress = typeof account === "string" ? account : account.address;
      if (opts?.approveTokenFirst !== false) {
        const allowance = await this.publicClient.readContract({
          address: plan.payToken,
          abi: [ERC20_ABI.allowance],
          functionName: "allowance",
          args: [accountAddress, this.address]
        });
        if (allowance < plan.price) {
          const { request: approveReq } = await this.publicClient.simulateContract({
            account,
            address: plan.payToken,
            abi: [ERC20_ABI.approve],
            functionName: "approve",
            args: [this.address, plan.price]
          });
          await this.walletClient.writeContract({ ...approveReq, account });
        }
      }
      const { request } = await this.publicClient.simulateContract({
        account,
        address: this.address,
        abi: [SUBSCRIPTION_ABI_V2.subscribe],
        functionName: "subscribe",
        args: [BigInt(planId)]
      });
      const hash2 = await this.walletClient.writeContract({ ...request, account });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: hash2 });
      return { txHash: hash2, ...this._parseSubscribedFromReceipt(receipt) };
    }
  }
  /**
   * One-step createPlan + subscribe (two transactions).
   * Saves the caller one round of plan lookup when the plan does not exist yet.
   */
  async createPlanAndSubscribe(params) {
    const { planId } = await this.createPlan(params);
    const subscribed = await this.subscribe(planId);
    return { planId, ...subscribed };
  }
  /** Cancel subscription. ERC8004SubscriptionManager settles payments immediately. */
  async cancel(subscriptionId) {
    const account = await this._resolveAccount();
    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.cancelSubscription],
      functionName: "cancelSubscription",
      args: [BigInt(subscriptionId)]
    });
    return this.walletClient.writeContract({ ...request, account });
  }
  // ── Read ─────────────────────────────────────────────────────────────────
  async hasActiveSubscription(subscriber, agentId) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.hasActiveSubscription],
      functionName: "hasActiveSubscription",
      args: [subscriber, BigInt(agentId)]
    });
    return result;
  }
  /**
   * Latest subscription of `subscriber` for `agentId`.
   *
   * ERC8004SubscriptionManager indexes subscriptions by ID only, so this scans
   * `getUserSubscriptions(subscriber)`. Prefers an active, non-expired entry;
   * otherwise falls back to the newest one.
   */
  async getSubscription(subscriber, agentId) {
    const subs = await this._readUserSubscriptions(subscriber);
    const matches = subs.filter((s) => Number(s.agentId) === Number(agentId));
    if (matches.length === 0) return null;
    const now = Math.floor(Date.now() / 1e3);
    const usable = matches.filter(
      (s) => Number(s.status) === 0 && (Number(s.planType) === 1 || now <= Number(s.nextBillingDate) + GRACE_PERIOD_SECONDS)
    );
    const picked = [...usable.length > 0 ? usable : matches].sort(
      (a, b) => Number(b.subscriptionId) - Number(a.subscriptionId)
    )[0];
    if (!picked) return null;
    const plan = await this._readPlanRaw(Number(picked.planId));
    return {
      subscriptionId: Number(picked.subscriptionId),
      subscriber: picked.subscriber,
      agentId: Number(picked.agentId),
      status: SUBSCRIPTION_STATUS_NAMES[Number(picked.status)] ?? "pending",
      startedAt: Number(picked.startDate),
      expiresAt: Number(picked.nextBillingDate),
      period: BILLING_PERIOD_NAMES[Number(plan.billingPeriod)] ?? "month"
    };
  }
  /** Full subscription detail (status, usage counters, payment token). */
  async getSubscriptionDetail(subscriptionId) {
    const s = await this._readSubscription(subscriptionId);
    const plan = await this._readPlanRaw(Number(s.planId));
    return {
      subscriptionId: Number(s.subscriptionId),
      planId: Number(s.planId),
      subscriber: s.subscriber,
      agentId: Number(s.agentId),
      status: Number(s.status),
      planType: Number(s.planType),
      startedAt: Number(s.startDate),
      nextBillingDate: Number(s.nextBillingDate),
      endDate: Number(s.endDate),
      period: BILLING_PERIOD_NAMES[Number(plan.billingPeriod)] ?? "month",
      payToken: s.paymentToken,
      amountPaid: s.totalPaid,
      currentPeriodUsage: s.currentPeriodUsage,
      totalUsage: s.totalUsage,
      remainingUsage: s.remainingUsage,
      lastPaymentDate: Number(s.lastPaymentDate)
    };
  }
  /** All subscription IDs owned by a wallet. */
  async getUserSubscriptions(user) {
    const subs = await this._readUserSubscriptions(user);
    return subs.map((s) => Number(s.subscriptionId));
  }
  // ── Raw reads ────────────────────────────────────────────────────────────
  async _readPlanRaw(planId) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getPlan],
      functionName: "getPlan",
      args: [BigInt(planId)]
    });
    return result;
  }
  async _readSubscription(subscriptionId) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getSubscription],
      functionName: "getSubscription",
      args: [BigInt(subscriptionId)]
    });
    return result;
  }
  async _readUserSubscriptions(user) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getUserSubscriptions],
      functionName: "getUserSubscriptions",
      args: [user]
    });
    return result;
  }
  /** Plan creator — the identity (ERC-721) owner of `agentId`. */
  async _agentOwner(agentId) {
    const registry = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.identityRegistry],
      functionName: "identityRegistry"
    });
    return this.publicClient.readContract({
      address: registry,
      abi: [SUBSCRIPTION_ABI_V2.ownerOf],
      functionName: "ownerOf",
      args: [BigInt(agentId)]
    });
  }
  // ── Receipt parsing (event-driven, no hardcoded IDs) ─────────────────────
  _findEventLog(receipt, topic) {
    return receipt.logs.find((l) => l.topics?.[0] === topic);
  }
  /** Parse planId from the PlanCreated event in a transaction receipt. */
  _parsePlanIdFromReceipt(receipt) {
    const log = this._findEventLog(receipt, PLAN_CREATED_TOPIC);
    if (!log) {
      throw new Error("PlanCreated event not found in transaction receipt");
    }
    const decoded = decodeEventLog({
      abi: [PLAN_CREATED_EVENT],
      data: log.data,
      topics: log.topics
    });
    return Number(decoded.args.planId);
  }
  /** Parse subscriptionId/subscriber/agentId/nextBillingDate from SubscriptionCreated. */
  _parseSubscribedFromReceipt(receipt) {
    const log = this._findEventLog(receipt, SUBSCRIBED_TOPIC);
    if (!log) {
      throw new Error("SubscriptionCreated event not found in transaction receipt");
    }
    const decoded = decodeEventLog({
      abi: [SUBSCRIBED_EVENT],
      data: log.data,
      topics: log.topics
    });
    return {
      subscriptionId: Number(decoded.args.subscriptionId),
      subscriber: decoded.args.subscriber,
      agentId: Number(decoded.args.agentId),
      nextBillingDate: Number(decoded.args.nextBillingDate)
    };
  }
};
async function guardSubscription(manager, user, agentId) {
  const active = await manager.hasActiveSubscription(user, agentId);
  if (!active) {
    throw new Error(
      `No active subscription for agent #${agentId}. Address ${user} must purchase a subscription first.`
    );
  }
  const sub = await manager.getSubscription(user, agentId);
  if (!sub) throw new Error(`Subscription not found for agent #${agentId}`);
  return sub;
}

// src/core/types.ts
var ActoraError = class extends Error {
  code;
  /** If NOT_SUBSCRIBED, carry enough info for wallet/X402 auto-payment */
  paymentInfo;
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
    this.name = "ActoraError";
  }
};

// src/subscription/agent-x402.ts
var getPlanAbi = {
  inputs: [{ name: "planId", type: "uint256" }],
  name: "getPlan",
  outputs: [
    { name: "planId", type: "uint256" },
    { name: "agentId", type: "uint256" },
    { name: "creator", type: "address" },
    { name: "price", type: "uint256" },
    { name: "period", type: "string" },
    { name: "active", type: "bool" },
    { name: "payToken", type: "address" },
    { name: "trialDays", type: "uint256" }
  ],
  stateMutability: "view",
  type: "function"
};
var subscribeAbi = {
  inputs: [{ name: "planId", type: "uint256" }],
  name: "subscribe",
  outputs: [{ name: "subscriptionId", type: "uint256" }],
  stateMutability: "payable",
  type: "function"
};
var hasActiveSubAbi = {
  inputs: [
    { name: "subscriber", type: "address" },
    { name: "agentId", type: "uint256" }
  ],
  name: "hasActiveSubscription",
  outputs: [{ name: "", type: "bool" }],
  stateMutability: "view",
  type: "function"
};
var Actora402 = class {
  constructor(config) {
    this.config = config;
  }
  config;
  /**
   * Require active subscription — or throw with auto-pay info.
   *
   * Usage:
   *   await x402.requireSubscription(agentId, address, { planIds: [1,2,3] })
   *
   * On success, returns silently.
   * On failure, throws ActoraError with paymentInfo populated
   * so the caller can auto-pay via wallet/X402.
   */
  async requireSubscription(agentId, address, opts) {
    const { publicClient, subscriptionManagerAddress } = this.config;
    const isActive = await publicClient.readContract({
      address: subscriptionManagerAddress,
      abi: [hasActiveSubAbi],
      functionName: "hasActiveSubscription",
      args: [address, BigInt(agentId)]
    });
    if (isActive) return;
    const plans = [];
    if (opts?.planIds && opts.planIds.length > 0) {
      for (const planId of opts.planIds) {
        try {
          const plan = await publicClient.readContract({
            address: subscriptionManagerAddress,
            abi: [getPlanAbi],
            functionName: "getPlan",
            args: [BigInt(planId)]
          });
          const planAgentId = Number(plan[1]);
          const planActive = plan[5];
          if (planActive && planAgentId === agentId) {
            plans.push({
              planId: Number(plan[0]),
              price: plan[3],
              period: plan[4],
              payToken: plan[6],
              trialDays: Number(plan[7])
            });
          }
        } catch {
        }
      }
    }
    const err = new ActoraError(
      "NOT_SUBSCRIBED" /* NOT_SUBSCRIBED */,
      `No active subscription for Agent #${agentId}. Use error.paymentInfo for auto-subscribe via X402/wallet.`
    );
    err.paymentInfo = {
      agentId,
      plans: plans.length > 0 ? plans : void 0
    };
    throw err;
  }
  /**
   * Subscribe to a plan + wait for receipt.
   * Returns subscriptionId from the Subscribed event.
   *
   * NOTE: For ERC20 plans, the caller must approve token spending
   * BEFORE calling this method. Use X402 SDK or wagmi's useWriteContract
   * for the approve step.
   */
  async subscribeAndWait(planId, price, payToken) {
    const { publicClient, walletClient, subscriptionManagerAddress } = this.config;
    const isETH = payToken === ZERO_ADDRESS;
    const { request } = await publicClient.simulateContract({
      address: subscriptionManagerAddress,
      abi: [subscribeAbi],
      functionName: "subscribe",
      args: [BigInt(planId)],
      account: walletClient.account?.address,
      value: isETH ? price : 0n
    });
    const hash2 = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash2 });
    const subIdHex = receipt.logs[0]?.topics?.[1];
    if (!subIdHex || subIdHex === "0x") {
      throw new Error("Failed to parse subscriptionId from Subscribed event");
    }
    return Number(BigInt(subIdHex));
  }
};

// src/subscription/index.ts
var SUBSCRIPTION_VERSION = "0.3.0";
export {
  Actora402,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_VERSION,
  SubscriptionManager,
  ZERO_ADDRESS,
  guardSubscription
};
//# sourceMappingURL=index.mjs.map