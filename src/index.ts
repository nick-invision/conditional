import {
  setOutput,
  info,
  warning,
  error,
  startGroup,
  endGroup,
} from "@actions/core";

// GitHub converts all input names to uppercase
const INPUT_PREFIX = "INPUT_";
const IF = "IF";
const IF_THEN = "IFTHEN";
const ELSE_IF = "ELSEIF";
const ELSE_IF_THEN = "ELSEIFTHEN";
const ELSE = "ELSE";
const THEN = "THEN";

const inputs = {
  if: "true",
  elseIf: "false",
  elseIf2: "true",
  elseIf3: "false",
  else: "neither",
};

process.env = {
  ...process.env,
  INPUT_IF: "true",
  INPUT_IFTHEN_OUTA: "A",
  INPUT_IFTHEN_OUTB: "B",
  INPUT_IFTHEN_OUTC: "C",
  INPUT_ELSEIF: "false",
  INPUT_ELSEIFTHEN_OUTA: "D",
  INPUT_ELSEIFTHEN_OUTB: "E",
  INPUT_ELSEIFTHEN_OUTC: "F",
  INPUT_ELSE_OUTA: "G",
  INPUT_ELSE_OUTB: "H",
  INPUT_ELSE_OUTC: "I",
  INPUT_IFTHEN: "",
  INPUT_ELSEIFTHEN: "",
  INPUT_ELSE: "",
};

// these are configured as inputs on the action. if they are not used and instead
// inputs are passed with identifiers or outvalues, they still exist but will be empty
const DEFAULT_INPUTS = ["INPUT_IFTHEN", "INPUT_ELSEIFTHEN", "INPUT_ELSE"];

interface Conditionals {
  if: Conditional;
  elseIfs: Conditional[];
  else: Parameter[];
}

interface Conditional {
  conditional: boolean;
  thens: Parameter[];
  sourceInput?: string;
}

interface Parameter {
  id: string;
  value: string;
}

const getCondition = (i: string): string => i.split("_")[1];
const getOutputId = (i: string): string => i.split("_").slice(2).join("_");
const isThen = (i: string): boolean => getCondition(i)?.endsWith(THEN) ?? false;
const isTrue = (value: string): boolean => value.toLowerCase() === "true";

function parseInputs(): Conditionals {
  const inputs: Parameter[] = Object.keys(process.env)
    .filter((key) => key.startsWith(INPUT_PREFIX))
    .filter((key) => process.env[key] && !DEFAULT_INPUTS.includes(key))
    .map((key) => {
      return {
        id: key,
        value: `${process.env[key]}`,
      };
    });

  return {
    if: getIf(inputs),
    elseIfs: getElseIfs(inputs),
    else: getElse(inputs),
  };
}

function getOutputs(conditional: string, inputs: Parameter[]): Parameter[] {
  const outputs: Parameter[] = [];
  for (const input of inputs) {
    if (getCondition(input.id) === conditional) {
      outputs.push({
        id: getOutputId(input.id),
        value: input.value,
      });
    }
  }

  startGroup(conditional);
  console.log("INPUTS:", JSON.stringify(inputs, null, 2));
  console.log("OUTPUTS:", JSON.stringify(outputs, null, 2));
  endGroup();
  return outputs;
}

function getIf(inputs: Parameter[]): Conditional {
  const condition = inputs.filter((i) => getCondition(i.id) === IF);

  if (condition.length !== 1) {
    throw new Error(`Only one ${IF} expected. Found ${condition.length}.`);
  }

  console.log(`getIf: ${JSON.stringify(condition, null, 2)}`);

  return {
    conditional: isTrue(condition[0].value),
    thens: getOutputs(IF_THEN, inputs),
  };
}

function getElseIfs(inputs: Parameter[]): Conditional[] {
  const conditionals: Conditional[] = [];
  const elseIfs = inputs
    .filter(
      (i) =>
        getCondition(i.id).startsWith(ELSE_IF) &&
        !getCondition(i.id).startsWith(ELSE_IF_THEN)
    )
    // sort by "elseIf" name in case multiple elseIfs are specified, this requires
    // the elseIfs to be in alphabetical order in the action configuration
    .sort((a, b) => (a.id > b.id ? 1 : -1));

  for (const elseIf of elseIfs) {
    // if multiple elseIf's exist, then an id can be appended which is used to
    // correllate the elseIfThen's to the proper elseIf
    // e.g., elseIfA maps to elseIfThenA_someOutput
    const elseIfId = elseIf.id.split(ELSE_IF)[1];
    conditionals.push({
      conditional: isTrue(elseIf.value),
      thens: getOutputs(`${ELSE_IF_THEN}${elseIfId}`, inputs),
      sourceInput: elseIf.id,
    });
  }

  return conditionals;
}

function getElse(inputs: Parameter[]): Parameter[] {
  return getOutputs(ELSE, inputs);
}

function setOutputs(thens: Parameter[]): void {
  for (const param of thens) {
    info(`name: ${param.id}; value: ${param.value}`);
    setOutput(param.id, param.value);
  }
}

function logResult(condition: string, outputs: Parameter[]): void {
  const outs = outputs.map((o) => o.id).join(", ");
  const cond = condition.replace(INPUT_PREFIX, "");

  if (condition === ELSE) {
    info(`Else block hit.  Set outputs(s) [${outs}]`);
  } else {
    info(`${cond} evaluated to true.  Set output(s) [${outs}]`);
  }
}

async function run() {
  const conditions = parseInputs();

  startGroup("TEST DATA");
  console.log(JSON.stringify(conditions, null, 2));
  endGroup();

  if (conditions.if.conditional) {
    logResult(IF, conditions.if.thens);
    setOutputs(conditions.if.thens);
    return;
  }

  for (const elseIf of conditions.elseIfs) {
    if (elseIf.conditional) {
      logResult(elseIf.sourceInput ?? ELSE_IF, elseIf.thens);
      setOutputs(elseIf.thens);
      return;
    }
  }

  if (conditions.else.length > 0) {
    logResult(ELSE, conditions.else);
    setOutputs(conditions.else);
    return;
  }

  warning(`Nothing evaluated to true so no outputs were set`);
}

run().catch((e) => {
  error(`An error occurred: ${e}`);
  process.exit(1);
});
