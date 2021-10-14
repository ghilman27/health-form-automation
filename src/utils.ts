import { QuestionConstructor, QuestionTemplate, Question } from './questions';

interface QuestionConstructors {
  [key: string]: QuestionConstructor;
}

const questionBuilder =
  (constructors: QuestionConstructors) =>
  (template: QuestionTemplate): Question => {
    const { type } = template;
    const QuestionConstructor = constructors[type];
    if (!QuestionConstructor) {
      throw Error(`${type} is not the right question type`);
    }
    return new QuestionConstructor(template);
  };

export const createQuestions = (
  templates: QuestionTemplate[],
  constructors: QuestionConstructors,
): Question[] => {
  const createQuestion = questionBuilder(constructors);
  return [...templates.map((template) => createQuestion(template))];
};
