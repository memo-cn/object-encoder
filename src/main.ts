import { createObjectEncoder } from '../lib';

setTimeout(demo);

const errorEncoder = createObjectEncoder<
    Error,
    {
        name: string;
        message: string;
        stack?: string | undefined;
    }
>({
    isSource(err) {
        return err instanceof Error;
    },
    toPlainObject(err) {
        return {
            name: err.name,
            message: err.message,
            stack: err.stack,
        };
    },
    fromPlainObject(arg) {
        const err = new Error(arg.message);
        err.name = arg.name;
        err.stack = arg.stack;
        return err;
    },
    typeTag: {
        key: '$type',
        value: 'Error',
        escapeCharacter: '_',
    },
});

function demo() {
    var obj = {
        age: 12,
        name: 'hello',
        $type: 1,
    };
    var a, b;
    console.log((a = errorEncoder.encode(obj)));
    console.log((b = errorEncoder.encode(new Error())));
    console.log(errorEncoder.decode(a));
    console.log(errorEncoder.decode(b));
}
