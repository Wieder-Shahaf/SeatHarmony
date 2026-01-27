def get_task(name):
    if name == 'game24':
        from tot.tasks.game24 import Game24Task
        return Game24Task()
    elif name == 'text':
        from tot.tasks.text import TextTask
        return TextTask()
    elif name == 'crosswords':
        from tot.tasks.crosswords import MiniCrosswordsTask
        return MiniCrosswordsTask()
    elif name == 'seatharmony':
        from tot.tasks.seat_harmony import SeatHarmonyTask
        return SeatHarmonyTask()
    else:
        raise NotImplementedError(f"Task '{name}' not found. Available tasks: game24, text, crosswords, seatharmony")