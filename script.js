(() => {
  // ----- Factories / Modules -----
  const PlayerFactory = (Name, Mark, IsAi) => ({ Name, Mark, IsAi });

  const Gameboard = (() => {
    let Board = Array(9).fill("");
    const Reset = () => (Board = Array(9).fill(""));
    const Get = () => Board.slice();
    const Set = (i, Mark) =>
      Board[i] === "" ? ((Board[i] = Mark), true) : false;
    return { Reset, Get, Set };
  })();

  const Rules = (() => {
    const Lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const Winner = (B) => {
      for (const [a, b, c] of Lines)
        if (B[a] && B[a] === B[b] && B[a] === B[c]) return B[a];
      return null;
    };
    const Tie = (B) => B.every((v) => v) && !Winner(B);
    return { Lines, Winner, Tie };
  })();

  const Ai = (() => {
    const RandomMove = (B) => {
      const E = B.map((v, i) => (v === "" ? i : -1)).filter((i) => i !== -1);
      return E.length ? E[Math.floor(Math.random() * E.length)] : null;
    };

    const FindLineMove = (B, Mark) => {
      for (const [a, b, c] of Rules.Lines) {
        const L = [B[a], B[b], B[c]];
        if (L.filter((v) => v === Mark).length === 2 && L.includes("")) {
          if (B[a] === "") return a;
          if (B[b] === "") return b;
          if (B[c] === "") return c;
        }
      }
      return null;
    };

    const Medium = (B, AiMark, HuMark) =>
      FindLineMove(B, AiMark) ??
      FindLineMove(B, HuMark) ??
      (B[4] === "" ? 4 : null) ??
      (() => {
        const C = [0, 2, 6, 8].filter((i) => B[i] === "");
        return C.length
          ? C[Math.floor(Math.random() * C.length)]
          : RandomMove(B);
      })();

    const Hard = (B, AiMark, HuMark) => {
      const Score = (X) =>
        Rules.Winner(X) === AiMark ? 10 : Rules.Winner(X) === HuMark ? -10 : 0;

      const Minimax = (X, Depth, Max) => {
        const S = Score(X);
        if (S) return S - (S > 0 ? Depth : -Depth);
        if (Rules.Tie(X)) return 0;

        let Best = Max ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
          if (X[i] !== "") continue;
          X[i] = Max ? AiMark : HuMark;
          const V = Minimax(X, Depth + 1, !Max);
          X[i] = "";
          Best = Max ? Math.max(Best, V) : Math.min(Best, V);
        }
        return Best;
      };

      let BestMove = null,
        BestVal = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (B[i] !== "") continue;
        B[i] = AiMark;
        const V = Minimax(B, 0, false);
        B[i] = "";
        if (V > BestVal) (BestVal = V), (BestMove = i);
      }
      return BestMove;
    };

    const GetMove = (Difficulty, Board, AiMark, HuMark) =>
      Difficulty === "easy"
        ? RandomMove(Board)
        : Difficulty === "medium"
        ? Medium(Board, AiMark, HuMark)
        : Hard(Board, AiMark, HuMark);

    return { GetMove };
  })();

  const DisplayController = (() => {
    const BoardEl = document.getElementById("Board");
    const StatusEl = document.getElementById("StatusText");

    const Status = (Text) => (StatusEl.textContent = Text);

    const Render = (Board, Locked) => {
      BoardEl.innerHTML = "";
      for (let i = 0; i < 9; i++) {
        const Btn = document.createElement("button");
        Btn.className = "Square";
        Btn.type = "button";
        Btn.dataset.index = String(i);
        Btn.textContent = Board[i];
        Btn.disabled = Locked || Board[i] !== "";
        BoardEl.appendChild(Btn);
      }
    };

    const OnClick = (Handler) => {
      BoardEl.addEventListener("click", (e) => {
        const T = e.target;
        if (!(T instanceof HTMLElement) || !T.classList.contains("Square"))
          return;
        Handler(Number(T.dataset.index));
      });
    };

    return { Render, Status, OnClick };
  })();

  // ----- Game Controller -----
  const GameController = (() => {
    let Human = PlayerFactory("You", "X", false);
    let Bot = PlayerFactory("Computer", "O", true);
    let Difficulty = "medium";
    let Turn = "Human"; // "Human" | "Bot"
    let Running = false;
    let Locked = false;

    const End = (WinnerMark) => {
      Running = false;
      Locked = true;
      const Msg =
        WinnerMark === Human.Mark
          ? `${Human.Name} wins!`
          : WinnerMark === Bot.Mark
          ? `Computer wins!`
          : `Tie game.`;
      DisplayController.Status(Msg);
      DisplayController.Render(Gameboard.Get(), Locked);
    };

    const CheckEnd = () => {
      const B = Gameboard.Get();
      const W = Rules.Winner(B);
      if (W) return End(W), true;
      if (Rules.Tie(B)) return End(null), true;
      return false;
    };

    const Start = ({ PlayerName, SelectedDifficulty }) => {
      Human = PlayerFactory(PlayerName || "You", "X", false);
      Bot = PlayerFactory("Computer", "O", true);
      Difficulty = SelectedDifficulty || "medium";

      Gameboard.Reset();
      Turn = "Human";
      Running = true;
      Locked = false;

      DisplayController.Status(`${Human.Name} turn (X)`);
      DisplayController.Render(Gameboard.Get(), Locked);
    };

    const Restart = () => {
      if (!Running)
        return Start({
          PlayerName: Human.Name,
          SelectedDifficulty: Difficulty,
        });
      Gameboard.Reset();
      Turn = "Human";
      Locked = false;
      DisplayController.Status(`${Human.Name}' turn (X)`);
      DisplayController.Render(Gameboard.Get(), Locked);
    };

    const BotMove = () => {
      Locked = true;
      DisplayController.Render(Gameboard.Get(), Locked);

      window.setTimeout(() => {
        if (!Running) return;
        const B = Gameboard.Get();
        const Move = Ai.GetMove(Difficulty, B.slice(), Bot.Mark, Human.Mark);
        if (Move !== null) Gameboard.Set(Move, Bot.Mark);

        Locked = false;
        DisplayController.Render(Gameboard.Get(), Locked);
        if (CheckEnd()) return;

        Turn = "Human";
        DisplayController.Status(`${Human.Name} turn (X)`);
      }, 200);
    };

    const TryHuman = (Index) => {
      if (!Running || Locked || Turn !== "Human") return;
      if (!Gameboard.Set(Index, Human.Mark)) return;

      DisplayController.Render(Gameboard.Get(), Locked);
      if (CheckEnd()) return;

      Turn = "Bot";
      DisplayController.Status(`Computer's turn (O)`);
      BotMove();
    };

    return { Start, Restart, TryHuman };
  })();

  // ----- App Wiring -----
  const App = (() => {
    const DiffEl = document.getElementById("DifficultySelect");
    const StartBtn = document.getElementById("StartButton");
    const RestartBtn = document.getElementById("RestartButton");

    const Settings = () => ({
      PlayerName: "Your",
      SelectedDifficulty: DiffEl.value,
    });

    const Init = () => {
      DisplayController.Render(Gameboard.Get(), true);
      DisplayController.Status("Click Start.");

      DisplayController.OnClick((i) => GameController.TryHuman(i));
      StartBtn.addEventListener("click", () =>
        GameController.Start(Settings())
      );
      RestartBtn.addEventListener("click", () => GameController.Restart());
    };

    return { Init };
  })();

  document.addEventListener("DOMContentLoaded", App.Init);
})();
