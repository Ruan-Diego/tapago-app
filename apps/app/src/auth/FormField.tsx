import { TextField, type TextFieldProps } from '@tapago/ui';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

type FormFieldProps<Values extends FieldValues, Output> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'error'
> & {
  control: Control<Values, unknown, Output>;
  name: Path<Values>;
};

/** `Output` é o que o esquema devolve quando difere do texto digitado. */
export function FormField<Values extends FieldValues, Output = Values>({
  control,
  name,
  ...rest
}: FormFieldProps<Values, Output>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({ control, name });

  return (
    <TextField
      {...rest}
      value={String(value ?? '')}
      onChangeText={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
