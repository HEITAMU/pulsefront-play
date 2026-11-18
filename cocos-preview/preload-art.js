/** Browser validation harness only. Production resources are imported by Creator. */
export async function preloadArt(cc) {
    const response = await fetch('./art-manifest.json?v=5c8bccdeaafa8f53');
    if (!response.ok) throw new Error('art-manifest HTTP ' + response.status);
    const manifest = await response.json();
    const uuids = [], paths = {};
    await Promise.all(manifest.map(async item => {
        const image = await new Promise((resolve, reject) => {
            cc.assetManager.loadRemote(item.url, { ext: '.png' }, (error, asset) => error ? reject(error) : resolve(asset));
        });
        if (!(image instanceof cc.ImageAsset)) throw new Error(item.name + ': expected real cc.ImageAsset');
        image._uuid = item.uuid; image.addRef();
        const texture = new cc.Texture2D();
        texture._uuid = item.uuid + '@6c48a'; texture.image = image;
        texture.setFilters(cc.Texture2D.Filter.LINEAR, cc.Texture2D.Filter.LINEAR);
        texture.setWrapMode(cc.Texture2D.WrapMode.CLAMP_TO_EDGE, cc.Texture2D.WrapMode.CLAMP_TO_EDGE);
        texture.addRef();
        const frame = new cc.SpriteFrame(); frame._uuid = item.uuid + '@f9941';
        frame.reset({ texture, rect: new cc.Rect(0, 0, item.width, item.height),
            originalSize: new cc.Size(item.width, item.height), offset: new cc.Vec2(0, 0), rotated: false });
        frame.packable = false; frame.addRef();
        cc.assetManager.assets.add(image._uuid, image);
        cc.assetManager.assets.add(texture._uuid, texture);
        cc.assetManager.assets.add(frame._uuid, frame);
        uuids.push(image._uuid, texture._uuid, frame._uuid);
        paths[frame._uuid] = [item.resourcePath || 'art/' + item.name + '/spriteFrame', 'cc.SpriteFrame'];
    }));
    // Register the unbuilt resources bundle using the actual engine config/cache.
    // No loader is mocked: BattleView still calls resources.load normally.
    cc.resources.init({ name: 'resources', base: './', importBase: './import/', nativeBase: './native/',
        debug: true, deps: [], uuids, paths, scenes: {}, packs: {},
        versions: { import: [], native: [] }, redirect: [], types: [], extensionMap: {} });
    await Promise.all(manifest.map(item => new Promise((resolve, reject) => {
        cc.resources.load(item.resourcePath || 'art/' + item.name + '/spriteFrame', cc.SpriteFrame, (error, frame) => {
            if (error) reject(error);
            else if (frame._uuid !== item.uuid + '@f9941') reject(new Error('Resource UUID mismatch: ' + item.name));
            else resolve(frame);
        });
    })));
    return { loaded: manifest.length, cache: cc.assetManager.assets.count };
}
