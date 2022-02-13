
export default class CustomHTMLTable {

    private htmlTable: HTMLTableElement;
    private headers: [number, string][];

    public constructor(id: string) {
        this.htmlTable = document.getElementById(id) as HTMLTableElement;
        this.headers = [];
    }

    public addHeaders(... headers: TableHeader[]): void {
        this.headers = new Array(headers.length);
        let row = this.htmlTable.createTHead().insertRow(0);

        for (let index = 0; index < headers.length; index++) {
            const element = headers[index];
            const cell = row.insertCell();

            this.headers[index] = [index, element.name];
            cell.innerText = element.name;
            if(element.width != undefined) {
                cell.classList.add(element.width);
            }

            if(element.action != undefined) {
                cell.onclick = element.action;
            }
        }
    }

    public addRow(value: string, ... objects: string[] | RowHeader[]): void {        
        if(this.htmlTable.tBodies == null) {
            this.htmlTable.createTBody();
        }

        let row: HTMLTableRowElement = this.htmlTable.tBodies[0].insertRow();

        row.classList.add(value)

        objects.forEach(element => {
            let cell: HTMLTableCellElement = row.insertCell();

            if(instanceOfRowHeader(element)) {
                if(element.click) {
                    cell.onclick = element.click;
                }

                if(element.isButton) {
                    cell.innerHTML = "<button class=\"btn btn-primary m-2\">" + element.value + "</button>";
                } else {
                    cell.innerHTML = element.value;
                }

            } else {
                cell.innerText = element;
            }
        });
    }

    public clearRows(): void {
        var tableBody = this.htmlTable.tBodies[0];

        for (let index = 0; index < tableBody.rows.length;) {
            tableBody.deleteRow(index);
        }
    }

    public deleteRow(index: number): void {
        var tableBody = this.htmlTable.tBodies[0];

        tableBody.deleteRow(index);
    }

    public deleteRowById(id: string): void {
        this.deleteRow(this.getRowByValue(id)!.rowIndex - 1);
    }

    public getRow(index: number): HTMLTableRowElement {
        var tableBody = this.htmlTable.tBodies[0];
        
        return tableBody.rows[index];
    }

    public getRowByValue(value: string): HTMLTableRowElement | null {
        var rowToReturn: HTMLTableRowElement | null = null;
        const tableBody = this.htmlTable.tBodies[0];
        
        for (let index = 0; index < tableBody.rows.length; index++) {
            const element = tableBody.rows[index];
            const className = element.classList[0];
            
            if(className == value) {
                rowToReturn = element;
            }
        }
        return rowToReturn;
    }

    public editRowValueByValue(rowId: string, cellName: string, newValue: string, disabledOnClick: boolean = false) {
        var row: HTMLTableRowElement | null = this.getRowByValue(rowId);

        if(row == null) {
            return;
        }

        let cellIndex: number = -1;
        this.headers.forEach((value) => {
            if(value[1] == cellName) {
                cellIndex = value[0];
            }
        })

        if(cellIndex == -1) {
            return;
        }
        row.cells[cellIndex].innerHTML = newValue;
        if(disabledOnClick) {
            row.cells[cellIndex].onclick = null;
        }
    }
    
    public editRowValueByIdx(rowIdx: number, cellName: string, newValue: string, disabledOnClick: boolean = false) {
        var row: HTMLTableRowElement | null = this.getRow(rowIdx);

        if(row == null) {
            return;
        }

        let cellIndex: number = -1;
        this.headers.forEach((value) => {
            if(value[1] == cellName) {
                cellIndex = value[0];
            }
        })

        if(cellIndex == -1) {
            return;
        }
        row.cells[cellIndex].innerHTML = newValue;
        if(disabledOnClick) {
            row.cells[cellIndex].onclick = null;
        }
    }

    public hideRowValue(rowId: string, cellName: string, visible: boolean): void {
        const row: HTMLTableRowElement | null = this.getRowByValue(rowId);

        if(row == null) {
            return;
        }

        let cellIndex: number = -1;
        this.headers.forEach((value) => {
            if(value[1] == cellName) {
                cellIndex = value[0];
            }
        })

        if(cellIndex == -1) {
            return;
        }

        row.cells[cellIndex].hidden = !visible;
    }
}

function instanceOfRowHeader(object: string | RowHeader): object is RowHeader {
    return (object as RowHeader).value !== undefined;
}

export interface TableHeader {
    name: string,
    width?: string,
    action?: ((this: GlobalEventHandlers, ev: MouseEvent) => any)
}

export interface RowHeader {
    value: string,
    isButton?: boolean,
    click?: ((this: GlobalEventHandlers, ev: MouseEvent) => any)
}