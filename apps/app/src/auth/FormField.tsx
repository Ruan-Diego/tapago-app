import { TextField, type TextFieldProps } from '@tapago/ui';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

type FormFieldProps<Values extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'error'
> & {
  control: Control<Values, unknown, Values>;
  name: Path<Values>;
};

export function FormField<Values extends FieldValues>({
  control,
  name,
  ...rest
}: FormFieldProps<Values>) {
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
