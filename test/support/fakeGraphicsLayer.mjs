// GraphicsLayer の代わり。レンダラーが使う add / remove / graphics（toArray・removeAll・addMany）だけ持つ。
export function fakeGraphicsLayer() {
    const items = [];
    const graphics = {
        toArray: () => [...items],
        removeAll() { items.splice(0, items.length); },
        addMany(list) { items.push(...list); },
        get length() { return items.length; },
    };
    return {
        graphics,
        add(graphic) { items.push(graphic); },
        remove(graphic) {
            const index = items.indexOf(graphic);
            if (index >= 0) items.splice(index, 1);
        },
        items,
    };
}
