export default class StringHelper {
    public static isNullOrEmpty(text: string)  {
        if(!!text) {
            return true;
        }

        return text.length == 0;
    }

    public static isNullOrWhitespace(text: string) {
        if(StringHelper.isNullOrEmpty(text)) {
            return true;
        }

        return text.trim().replace(" ", "").length == 0;
    }
}