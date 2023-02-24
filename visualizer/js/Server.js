const DIRECTION = {
    NORMAL:   0,
    RUN_DOWN: 1,
    RUN_UP:   2
};

class Server {

    constructor() {
        this._canvas = document.createElement('canvas');

        this._canvas.width  = WIDTH;
        this._canvas.height = HEIGHT;

        document.querySelector('.views').appendChild(this._canvas);

        this._snapshotIndex = 0;
        this._snapshotId    = 1;
        this._snapshots     = [{
            snapshotId: this._snapshotId,
            object:     {
                position:      { x: 0, y: 0 },
                moveDirection: { x: 0, y: 0 }
            }
        }];

        this._clientState = {
            delta:     null,
            direction: DIRECTION.NORMAL,
            step:      0
        };

        this._curCommandIndex = -1;
        this._commands = [];
    }

    start() {
        setInterval(() => {
            this._update();
        }, 1000 / TICK_RATE);
    }

    _update() {
        const prevSnapshot = this._snapshots[this._snapshotIndex];

        this._snapshotId++;
        this._snapshotIndex++;

        const newSnapshot = {
            snapshotId: this._snapshotId,
            object:     {
                position: { x: 0, y: 0 },
                moveDirection: { x: 0, y: 0 }
            }
        };

        if (this._clientState.delta === null && this._commands.length) {
            this._clientState.delta = this._snapshotId - this._commands[0].snapshotId;
        }

        const commandsCount = this._commands.length - this._curCommandIndex - 1;
        let   command       = commandsCount ? this._commands[this._curCommandIndex + 1].object : null;
        let   prevCommand   = this._curCommandIndex >= 0 ? this._commands[this._curCommandIndex].object : null;
        let   nextCommand   = commandsCount >= 2 ? this._commands[this._curCommandIndex + 2] : null;
        const lastCommand   = this._commands.length >= 0 ? this._commands[this._commands.length - 1] : null;

        const ppDelta       = this._clientState.delta - (newSnapshot.snapshotId - lastCommand.snapshotId);

        if (!command) {
            decreaseStep();

        } else if (!nextCommand) {
            if (this._clientState.direction === DIRECTION.RUN_DOWN) {
                decreaseStep();
            } else if (this._clientState.direction === DIRECTION.RUN_UP) {
                increaseStep();
            } else {
                // Do nothing
            }
        } else {
            increaseStep();
        }

        if (nextCommand) {
            newSnapshot.object.position.x = mix(command.position.x, nextCommand.position.x, this._clientState.step / 5);
        } else if (command) {
            newSnapshot.object.position.x = command.position.x + command.moveDirection.x * (this._clientState.step / 5) * 0.8;
        } else {
            newSnapshot.object.position.x = prevSnapshot.object.position.x + lastCommand.moveDirection.x;
        }

        this._snapshots.push(newSnapshot);

        this._draw();

        connection.sendMessageToClient('snapshot', this._snapshots[this._snapshots.length - 1]);

        function decreaseStep() {
            this._clientState.direction = DIRECTION.RUN_DOWN;

            if (this._clientState.step === 0) {
                this._clientState.step = 4;
                this._clientState.delta++;

                prevCommand = command;
                command     = nextCommand;
                nextCommand = commandsCount >= 3 ? this._commands[this._curCommandIndex + 3] : null;

                this._curCommandIndex--;

            } else {
                this._clientState.step--;

                if (this._clientState.step === 0) {
                    this._clientState.direction = DIRECTION.NORMAL;
                }
            }
        }

        function increaseStep() {
            this._clientState.direction = DIRECTION.RUN_UP;

            this._clientState.step++;

            if (this._clientState.step === 4) {
                this._clientState.step = 0;
                this._clientState.delta--;

                this._clientState.direction = DIRECTION.NORMAL;

                nextCommand = command;
                command     = prevCommand;
                prevCommand = this._curCommandIndex > 0 ? this._commands[this._curCommandIndex - 1].object : null

                this._curCommandIndex++;
            }
        }
    }

    _draw() {
        const ctx = this._canvas.getContext('2d');

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        ctx.save();

        const snap = this._getLastSnapshot();

        if (!snap) {
            debugger
        }

        ctx.translate(snap.object.position.x, 100 + snap.object.position.y);
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#0F0';
        ctx.fill();

        ctx.restore();

        if (this._snapshotId % 2 === 0) {
            ctx.beginPath();
            ctx.arc(8, 8, 8, 0, 2 * Math.PI);

            ctx.fillStyle = '#0F0';
            ctx.fill();
        }
    }

    onMessage(message, data) {
        this._commands.push(data);
    }

    _getLastSnapshot() {
        return this._snapshots[this._snapshotIndex];
    }

}

function mix(v1, v2, m) {
    return v1 + (v2 - v1) * m;
}
