import {
  TextQuestion,
  SelectQuestion,
  RadioQuestion,
  CheckboxQuestion,
} from './questions';

export const questionConstructors = {
  text: TextQuestion,
  select: SelectQuestion,
  radio: RadioQuestion,
  checkbox: CheckboxQuestion,
};
