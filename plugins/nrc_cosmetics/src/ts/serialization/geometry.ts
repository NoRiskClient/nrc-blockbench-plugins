export function buildGeoJson(): string {
    const compiled = Codecs.bedrock.compile();
    return typeof compiled === 'string' ? compiled : JSON.stringify(compiled, null, 2);
}
