import { useState } from 'react';
import { AppHeader } from '../../shared/AppHeader';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { groupOf, lastResult, loadSettings, makeQuestions, type BinarySettings } from '../core';
import { BinarySetup } from './BinarySetup';
import { BitsToChar } from './BitsToChar';
import { CharToBits } from './CharToBits';
import { Countdown } from './Countdown';
import { Feedback } from './Feedback';
import { QuizHeader } from './QuizHeader';
import { ResumePrompt } from './ResumePrompt';
import { Results } from './Results';
import { useBinarySession } from './useBinarySession';

export function BinaryTrainer(props: { onHome: () => void }) {
  const { onHome } = props;
  const session = useBinarySession();
  const { state } = session;
  const [settings, setSettings] = useState<BinarySettings>(() => loadSettings());
  const [confirmEnd, setConfirmEnd] = useState(false);

  const startRound = (s: BinarySettings, mode = s.mode) => {
    session.start(mode, makeQuestions(s.groups, s.questionCount));
  };

  const overlays = (
    <>
      {session.awaitingResume && state && (
        <ResumePrompt
          questionNumber={Math.min(state.questions.length, state.index + 1)}
          total={state.questions.length}
          mode={state.mode}
          onResume={session.chooseResume}
          onNewRound={session.endRound}
        />
      )}
      {session.countingDown && <Countdown onDone={session.countdownDone} />}
    </>
  );

  if (!state) {
    return (
      <div>
        <AppHeader onHome={onHome} />
        <BinarySetup
          onStart={(s) => {
            setSettings(s);
            startRound(s);
          }}
        />
        {overlays}
      </div>
    );
  }

  if (state.stage === 'finished') {
    return (
      <div>
        <AppHeader />
        <Results
          results={state.results}
          groupBits={settings.groupBits}
          onPlayAgain={() => startRound(settings, state.mode)}
          onSetup={session.endRound}
          onHome={() => {
            session.endRound();
            onHome();
          }}
        />
        {overlays}
      </div>
    );
  }

  const character = state.questions[state.index];
  const result = lastResult(state);
  const submitDraft = () => session.submit(state.draft);

  return (
    <div>
      <QuizHeader index={state.index} total={state.questions.length} onEnd={() => setConfirmEnd(true)} />
      {state.mode === 'charToBits' ? (
        <CharToBits
          key={state.index}
          character={character}
          draft={state.draft}
          groupBits={settings.groupBits}
          onDraft={session.setDraft}
          onSubmit={submitDraft}
        />
      ) : (
        <BitsToChar
          key={state.index}
          character={character}
          draft={state.draft}
          groupBits={settings.groupBits}
          digitsOnly={state.questions.every((q) => groupOf(q) === 'digits')}
          onDraft={session.setDraft}
          onSubmit={submitDraft}
        />
      )}
      {state.stage === 'feedback' && !state.suspended && result && (
        <Feedback
          result={result}
          mode={state.mode}
          groupBits={settings.groupBits}
          isLast={state.index + 1 >= state.questions.length}
          onNext={session.next}
        />
      )}
      <ConfirmDialog
        open={confirmEnd}
        title="End this round?"
        message="Your progress in this round will be lost."
        confirmLabel="End round"
        cancelLabel="Keep going"
        onConfirm={() => {
          setConfirmEnd(false);
          session.endRound();
        }}
        onCancel={() => setConfirmEnd(false)}
      />
      {overlays}
    </div>
  );
}
