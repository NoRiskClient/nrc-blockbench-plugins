// Bedrock geometry (minecraft:geometry, format 1.12) for the model — matches GeoModelParser.
export function buildGeoJson(): string {
    const compiled = Codecs.bedrock.compile();
    return typeof compiled === 'string' ? compiled : JSON.stringify(compiled, null, 2);
}
