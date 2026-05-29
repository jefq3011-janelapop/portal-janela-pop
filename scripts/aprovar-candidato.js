const { approveCandidate } = require("./lib/editorial");

const id = process.argv[2];

if (!id) {
  console.error("Informe o codigo do candidato. Exemplo: npm.cmd run aprovar -- jp-123abc");
  process.exit(1);
}

try {
  const result = approveCandidate(id);
  console.log(result.alreadyApproved ? `Post ja existia: posts/${result.fileName}` : `Post criado: posts/${result.fileName}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
