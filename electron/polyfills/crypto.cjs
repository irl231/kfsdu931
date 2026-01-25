globalThis.crypto ??= {};
globalThis.crypto.randomUUID ??= () => {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.trunc(Math.random() * 256);
  return (
    hex(bytes[0]) +
    hex(bytes[1]) +
    hex(bytes[2]) +
    hex(bytes[3]) +
    "-" +
    hex(bytes[4]) +
    hex(bytes[5]) +
    "-" +
    hex(bytes[6]) +
    hex(bytes[7]) +
    "-" +
    hex(bytes[8]) +
    hex(bytes[9]) +
    "-" +
    hex(bytes[10]) +
    hex(bytes[11]) +
    hex(bytes[12]) +
    hex(bytes[13]) +
    hex(bytes[14]) +
    hex(bytes[15])
  );
};

function hex(byte) {
  return byte.toString(16).padStart(2, "0");
}

module.exports = crypto;

module.exports.randomUUID = crypto.randomUUID;
