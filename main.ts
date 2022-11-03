import $, {
  CommandBuilder,
  CommandResult,
} from "https://deno.land/x/dax@0.15.0/mod.ts";

async function confirm(r: CommandBuilder): Promise<CommandResult> {
  const ret = await r.stdout("piped");
  if (ret.code != 0) {
    Deno.exit(ret.code);
  }
  return ret;
}

const { stdout: configs } = await confirm(
  $`git config --get-regexp '^users\.'`.stdout("piped")
);
const users: Record<string, Record<string, string>> = {};
const pat =
  /^users\.(?<key>[a-zA-Z0-9]+)\.(?<field>name|email)\s+(?<value>.+)$/;

for (const line of configs.split("\n")) {
  const mat = pat.exec(line);
  if (mat == null || mat.groups == null) continue;
  const { key, field, value } = mat.groups;
  if (key in users) {
    users[key][field] = value;
  } else {
    users[key] = { [field]: value };
  }
}

for (const key in users) {
  const user = users[key];
  if (user.name == null) {
    console.error(`users.${key}.name is not defined`);
    delete users[key];
  }
  if (user.email == null) {
    console.error(`users.${key}.name is not defined`);
    delete users[key];
  }
}

const input = Object.entries(users)
  .map(([k, v]) => `${k}: ${v.name} <${v.email}>`)
  .join("\n");

if (input === "") {
  console.error("no valid user found");
  Deno.exit(1);
}

const { stdout: selected } = await confirm(
  $`fzf --reverse`.stdin(input).stdout("piped")
);

const key = /^([a-zA-Z0-9]+):/.exec(selected)![1];
const user = users[key];

await confirm($`git config --local user.name ${user.name}`);
await confirm($`git config --local user.email ${user.email}`);

console.log(`set local git user: ${user.name} <${user.email}>`);
