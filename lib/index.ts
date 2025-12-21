/**
 * @template Source
 *   The source type to be converted, such as custom class instances, special objects, etc.
 *   待转换的源类型，如自定义类实例、特殊对象等。
 * @template PlainObject
 *   The encoded plain JS object type, containing field information required to restore the source type.
 *   编码后的普通 JS 对象类型，包含还原源类型所需的字段信息。
 */
export type ObjectEncoder<Source, PlainObject> = {
    /**
     * Converts Source type to PlainObject type with key escaping and type tag added. returns the input as-is if it does not belong to the Source type.
     * 将 Source 类型转换为 PlainObject 类型，包含键名转义和类型标签添加。若入参不属于 Source 类型则直接原样返回。
     */
    encode: <T>(arg: T) => T extends Source ? PlainObject : T;
    /**
     * Decodes the input value. Converts PlainObject type back to Source type with key unescaping and type tag removed. returns the input as-is if it does not belong to the PlainObject type.
     * 对输入值进行解码。将 PlainObject 类型转换回 Source 类型，包含键名还原和类型标签移除。若入参不属于 PlainObject 类型则直接原样返回。
     */
    decode: <T>(arg: T) => T extends PlainObject ? Source : T;
};

export type EncoderOptions<Source, PlainObject> = {
    /**
     * Type tag: A fixed property added to PlainObject to identify it as converted from Source type.
     * 类型标签：在 PlainObject 中添加的固定属性，标识其源自 Source 类型的转换。
     */
    typeTag: {
        /**
         * The key name of the type tag, e.g., "$type".
         * 类型标签的键名，例如 "$type"。
         */
        key: string;
        /**
         * The value of the type tag, which can be a class name.
         * 类型标签的键值，可为类名。
         */
        value: string | number | null;
        /**
         * Escape character used as a prefix for key names conflicting with typeTag.key. For example: If key is "$type" and escapeCharacter is "_", the conflicting key "$type" will be escaped to "_$type".
         * 用于转义与 typeTag.key 冲突的键名的前缀字符。例如：若 key 为 "$type"，escapeCharacter 为 "_"，则冲突键名 "$type" 会被转义为 "_$type"。
         */
        escapeCharacter: string;
    };

    /**
     * Determines whether the argument is of Source type.
     * 判断参数是否为 Source 类型。
     */
    isSource: (arg: unknown) => boolean;

    /**
     * Converts the Source type to PlainObject type.
     * 将 Source 类型转换为 PlainObject 类型。
     */
    toPlainObject: (arg: Source) => PlainObject;

    /**
     * Converts the PlainObject type back to Source type.
     * 将 PlainObject 类型转换回 Source 类型。
     */
    fromPlainObject: (arg: PlainObject) => Source;
};

/**
 * Creates an encoder for bidirectional conversion between Source type and PlainObject type.
 * 创建一个用于 Source 类型与 PlainObject 类型双向转换的编码器。
 * @template Source - The source type to be converted. 待转换的源类型。
 * @template PlainObject - The plain object type after conversion. 转换后的纯对象类型。
 * @param {EncoderOptions<Source, PlainObject>} options
 * @returns {ObjectEncoder<Source, PlainObject>} - An instance of ObjectEncoder that implements bidirectional conversion. 实现双向转换的 ObjectEncoder 实例。
 */
export function createObjectEncoder<Source, PlainObject>({
    typeTag: { key, escapeCharacter, value },
    toPlainObject,
    fromPlainObject,
    isSource,
}: EncoderOptions<Source, PlainObject>): ObjectEncoder<Source, PlainObject> {
    return {
        encode,
        decode,
    };

    function encode(arg: any): any {
        const isSourceType = isSource(arg);
        const converted = isSourceType ? toPlainObject(arg) : arg;
        let escaped = replaceObjectKey(converted, prependEscapeChar);
        if (isSourceType) {
            escaped = {
                [key]: value,
                ...escaped,
            };
        }
        return escaped;
    }

    function decode(arg: any): any {
        if (Object(arg) !== arg) {
            return arg;
        }
        const isTargetType = arg[key] === value;
        if (isTargetType) {
            arg = { ...arg };
            delete arg[key];
        }
        let unescaped = replaceObjectKey(arg, removePrependedEscapeChar);
        if (isTargetType) {
            unescaped = fromPlainObject(unescaped);
        }
        return unescaped;
    }

    /**
     * 替换对象中的键名（用于处理与类型标识字段的冲突）
     * 支持数组和纯对象，通过回调函数实现键名的转义/还原
     */
    function replaceObjectKey(arg: any, replaceKey: typeof prependEscapeChar | typeof removePrependedEscapeChar): any {
        if (Object(arg) !== arg) {
            return arg;
        }
        const clone: any = Array.isArray(arg) ? [] : {};
        let containsEscapedKey = false;
        for (let [k, v] of Object.entries(arg)) {
            const escapedKey = replaceKey(k);
            clone[escapedKey] = v;
            if (escapedKey !== k) {
                containsEscapedKey = true;
            }
        }
        return containsEscapedKey ? clone : arg;
    }

    /**
     * 若键名符合 N 个转义字符 + 类型标签键名的格式，则在前面添加一个转义字符进行转义。
     * 示例："$type" → "_$type"（假设转义字符为 "_"）。
     */
    function prependEscapeChar(str: string) {
        return getEscapeCharCount(str) === -1 ? str : escapeCharacter + str;
    }

    /**
     * 移除由 prependEscapeChar 添加的一个转义字符，还原键名。
     * 示例："_$type" → "$type"（假设转义字符为 "_"）。
     */
    function removePrependedEscapeChar(str: string): string {
        return getEscapeCharCount(str) > 0 ? str.slice(1) : str;
    }

    /**
     * 检查键名是否符合 N 个转义字符 + 类型标签键名的格式。
     * @param {string} str 要检查的键名。
     * @returns {number} 符合格式时返回转义字符数量 N，否则返回 -1。
     */
    function getEscapeCharCount(str: string): number {
        let count = str.length - key.length;
        if (count >= 0) {
            if (str.slice(-key.length) === key) {
                for (let i = 0; i < count; i++) {
                    if (str[i] !== escapeCharacter) {
                        return -1;
                    }
                }
                return count;
            }
        }
        return -1;
    }
}
